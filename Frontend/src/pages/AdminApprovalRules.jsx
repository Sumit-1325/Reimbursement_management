import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import Navbar from "@/components/layout/Navbar"
import SideNavbar from "@/components/layout/SideNavbar"
import PageBreadcrumb from "@/components/layout/PageBreadcrumb"
import { useUser } from "@/context/UserContext"
import { adminApi } from "@/api/adminApi"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

const STEP_OPTIONS = ["MANAGER", "FINANCE", "DIRECTOR", "CFO"]
const CFO_TRIGGER_DESIGNATIONS = new Set(["MANAGER", "DIRECTOR"])

function normalizeSteps(rawSteps) {
  const incoming = Array.isArray(rawSteps) ? rawSteps : []
  const deduped = []
  const seen = new Set()

  for (const rawStep of incoming) {
    const designation = String(rawStep?.designation || "").trim().toUpperCase()
    if (!STEP_OPTIONS.includes(designation) || seen.has(designation)) {
      continue
    }

    deduped.push({
      designation,
      required: Boolean(rawStep?.required),
    })
    seen.add(designation)
  }

  const hasCfoTrigger = deduped.some((step) => CFO_TRIGGER_DESIGNATIONS.has(step.designation))
  if (hasCfoTrigger && !seen.has("CFO")) {
    deduped.push({ designation: "CFO", required: false })
  }

  if (deduped.length === 0) {
    return [{ designation: "FINANCE", required: true }]
  }

  return deduped
}

function normalizeRequiredApproverIds(rawIds, selectedDesignations, approverUsers) {
  const ids = Array.isArray(rawIds) ? rawIds : []
  const uniqueIds = new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))
  const designationSet = new Set(selectedDesignations)

  return approverUsers
    .filter((user) => uniqueIds.has(user.id) && designationSet.has(String(user.designation || "").toUpperCase()))
    .map((user) => user.id)
}

function extractErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  )
}

function formatAmount(amount, currencyCode) {
  return `${currencyCode || "INR"} ${Number(amount || 0).toLocaleString("en-IN")}`
}

function formatDate(value) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString()
}

export default function AdminApprovalRules() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [rule, setRule] = useState(null)
  const [pendingExpenses, setPendingExpenses] = useState([])
  const [approverUsers, setApproverUsers] = useState([])
  const [selectedExpenseId, setSelectedExpenseId] = useState("")
  const [form, setForm] = useState({
    name: "",
    managerFirst: true,
    approverSequence: true,
    minimumApprovalPercentage: 100,
    steps: [{ designation: "FINANCE", required: true }],
    requiredApproverIds: [],
  })

  const selectedExpense = useMemo(
    () => pendingExpenses.find((expense) => expense.id === selectedExpenseId) || null,
    [pendingExpenses, selectedExpenseId]
  )

  const selectedDesignations = useMemo(
    () => form.steps.map((step) => step.designation),
    [form.steps]
  )

  const matchingApprovers = useMemo(() => {
    const designationSet = new Set(selectedDesignations)
    return approverUsers
      .filter((user) => designationSet.has(String(user.designation || "").toUpperCase()))
      .sort((a, b) => {
        const byDesignation = String(a.designation || "").localeCompare(String(b.designation || ""))
        if (byDesignation !== 0) return byDesignation
        const aName = `${a.firstName || ""} ${a.lastName || ""}`.trim()
        const bName = `${b.firstName || ""} ${b.lastName || ""}`.trim()
        return aName.localeCompare(bName)
      })
  }, [approverUsers, selectedDesignations])

  const loadData = async () => {
    setLoading(true)
    try {
      const [rulesResponse, expensesResponse, usersResponse] = await Promise.all([
        adminApi.getApprovalRules(),
        adminApi.getPendingExpenses(),
        adminApi.getAllUsers({ page: 1, limit: 100 }),
      ])

      const rules = rulesResponse?.data?.rules || []
      const firstRule = rules[0] || null
      const expenses = expensesResponse?.data?.expenses || []
      const users = usersResponse?.data?.users || []
      const approvers = users.filter((user) => user.status === "ACTIVE" && Boolean(user.isApprover))

      setRule(firstRule)
      setPendingExpenses(expenses)
      setApproverUsers(approvers)
      setSelectedExpenseId((current) => {
        if (current && expenses.some((item) => item.id === current)) {
          return current
        }
        return expenses[0]?.id || ""
      })

      if (firstRule) {
        setForm({
          name: firstRule.name || "",
          managerFirst: Boolean(firstRule.managerFirst),
          approverSequence: firstRule.approverSequence === undefined ? true : Boolean(firstRule.approverSequence),
          minimumApprovalPercentage: Number(firstRule.minimumApprovalPercentage || 100),
          steps: normalizeSteps(
            firstRule.steps?.map((step) => ({
              designation: step.designation,
              required: Boolean(step.required),
            })) || []
          ),
          requiredApproverIds: normalizeRequiredApproverIds(
            firstRule.requiredApproverIds || [],
            firstRule.steps?.map((step) => step.designation) || [],
            approvers
          ),
        })
      }
    } catch (error) {
      toast.error(extractErrorMessage(error, "Failed to load approval rules"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setForm((previous) => ({
      ...previous,
      requiredApproverIds: normalizeRequiredApproverIds(
        previous.requiredApproverIds,
        previous.steps.map((step) => step.designation),
        approverUsers
      ),
    }))
  }, [approverUsers, form.steps])

  const handleStepChange = (index, key, value) => {
    setForm((previous) => {
      const nextSteps = [...previous.steps]
      nextSteps[index] = {
        ...nextSteps[index],
        [key]: value,
      }
      return {
        ...previous,
        steps: normalizeSteps(nextSteps),
      }
    })
  }

  const handleAddStep = () => {
    setForm((previous) => ({
      ...previous,
      steps: normalizeSteps([...previous.steps, { designation: "DIRECTOR", required: false }]),
    }))
  }

  const handleRemoveStep = (index) => {
    setForm((previous) => ({
      ...previous,
      steps: normalizeSteps(previous.steps.filter((_, i) => i !== index)),
    }))
  }

  const handleSaveRule = async () => {
    if (!rule?.id) {
      toast.error("No approval rule found")
      return
    }

    if (!form.name.trim()) {
      toast.error("Rule name is required")
      return
    }

    if (form.steps.length === 0) {
      toast.error("Add at least one approver step")
      return
    }

    const designations = form.steps.map((step) => step.designation)
    const hasDuplicate = new Set(designations).size !== designations.length
    if (hasDuplicate) {
      toast.error("Each designation can be used only once")
      return
    }

    setSaving(true)
    try {
      const response = await adminApi.updateApprovalRule(rule.id, {
        name: form.name.trim(),
        managerFirst: form.managerFirst,
        approverSequence: form.approverSequence,
        minimumApprovalPercentage: Number(form.minimumApprovalPercentage || 100),
        steps: form.steps,
        requiredApproverIds: form.requiredApproverIds,
      })

      const updatedRule = response?.data?.rule
      if (updatedRule) {
        setRule(updatedRule)
        setForm({
          name: updatedRule.name,
          managerFirst: Boolean(updatedRule.managerFirst),
          approverSequence: updatedRule.approverSequence === undefined ? true : Boolean(updatedRule.approverSequence),
          minimumApprovalPercentage: Number(updatedRule.minimumApprovalPercentage || 100),
          steps: normalizeSteps(
            updatedRule.steps.map((step) => ({
              designation: step.designation,
              required: Boolean(step.required),
            }))
          ),
          requiredApproverIds: normalizeRequiredApproverIds(
            updatedRule.requiredApproverIds || [],
            updatedRule.steps?.map((step) => step.designation) || [],
            approverUsers
          ),
        })
      }

      toast.success("Approval rule saved")
    } catch (error) {
      toast.error(extractErrorMessage(error, "Failed to save approval rule"))
    } finally {
      setSaving(false)
    }
  }

  const handleAssignRule = async () => {
    if (!rule?.id || !selectedExpenseId) {
      toast.error("Select both rule and pending expense")
      return
    }

    setApplying(true)
    try {
      await adminApi.assignRuleToExpense(rule.id, selectedExpenseId)
      toast.success("Approval chain generated. Manager is first when manager-first is enabled.")
      navigate("/admin-dashboard")
    } catch (error) {
      toast.error(extractErrorMessage(error, "Failed to generate approval chain"))
    } finally {
      setApplying(false)
    }
  }

  const handleRequiredApproverToggle = (approverId, checked) => {
    setForm((previous) => {
      const current = new Set(previous.requiredApproverIds)
      if (checked) {
        current.add(approverId)
      } else {
        current.delete(approverId)
      }

      return {
        ...previous,
        requiredApproverIds: Array.from(current),
      }
    })
  }

  return (
    <div className="flex h-screen bg-slate-950">
      <SideNavbar hideUsers={user?.role !== "ADMIN"} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar hideUsers={user?.role !== "ADMIN"} />

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            <PageBreadcrumb
              items={[{ label: "Home", to: "/admin-dashboard" }]}
              current="Approval Rules"
            />

            <div>
              <h1 className="text-3xl font-bold text-white">Approval Rules</h1>
              <p className="text-slate-400 mt-1">
                Live rule configuration and pending request assignment from backend.
              </p>
            </div>

            {loading ? (
              <Card className="bg-slate-900/80 border-slate-800">
                <CardContent className="pt-6 text-slate-300">Loading...</CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-slate-900/80 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Pending Requests</CardTitle>
                    <CardDescription className="text-slate-300">Select an expense and generate approval chain</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pendingExpenses.length === 0 ? (
                      <p className="text-slate-400">No pending requests available.</p>
                    ) : (
                      <>
                        <Label className="text-slate-200">Pending expense</Label>
                        <select
                          value={selectedExpenseId}
                          onChange={(event) => setSelectedExpenseId(event.target.value)}
                          className="w-full h-10 rounded-lg border border-slate-700 bg-slate-900/50 px-3 text-slate-100"
                        >
                          {pendingExpenses.map((expense) => {
                            const employeeName = `${expense.employee?.firstName || ""} ${expense.employee?.lastName || ""}`.trim() || "Unknown"
                            return (
                              <option key={expense.id} value={expense.id}>
                                {employeeName} - {formatAmount(expense.amount, expense.currencyCode)}
                              </option>
                            )
                          })}
                        </select>

                        {selectedExpense && (
                          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm space-y-2">
                            <p className="text-slate-100">{selectedExpense.description || "No description"}</p>
                            <p className="text-slate-400">Submitted: {formatDate(selectedExpense.submittedAt)}</p>
                            <p className="text-slate-400">
                              Employee Manager: {selectedExpense.employee?.manager
                                ? `${selectedExpense.employee.manager.firstName} ${selectedExpense.employee.manager.lastName || ""}`
                                : "Not assigned"}
                            </p>
                            <Badge variant="outline" className="text-amber-200 border-amber-500/40 bg-amber-500/20">
                              Existing Requests: {selectedExpense._count?.approvalRequests || 0}
                            </Badge>
                          </div>
                        )}

                        <Button
                          type="button"
                          className="bg-blue-600 text-white hover:bg-blue-500"
                          disabled={applying || !selectedExpenseId}
                          onClick={handleAssignRule}
                        >
                          {applying ? "Generating..." : "Generate Approval Chain"}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/80 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Rule Configuration</CardTitle>
                    <CardDescription className="text-slate-300">
                      When manager-first is enabled, that employee's manager is always first approver.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-200">Rule Name</Label>
                      <Input
                        value={form.name}
                        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Rule name"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                      <div>
                        <p className="text-slate-100 font-medium">Is manager an approver?</p>
                        <p className="text-xs text-slate-300">If enabled, request goes first to that employee's manager before other approvers.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.managerFirst}
                        onChange={(event) => setForm((prev) => ({ ...prev, managerFirst: event.target.checked }))}
                        className="h-5 w-5 rounded border border-slate-500 bg-slate-950 accent-blue-500"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                      <div>
                        <p className="text-slate-100 font-medium">Approvers Sequence</p>
                        <p className="text-xs text-slate-300">If enabled, approval follows listed order; if disabled, process can be treated as parallel later.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.approverSequence}
                        onChange={(event) => setForm((prev) => ({ ...prev, approverSequence: event.target.checked }))}
                        className="h-5 w-5 rounded border border-slate-500 bg-slate-950 accent-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-200">Minimum Approval Percentage</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={form.minimumApprovalPercentage}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              minimumApprovalPercentage: Number(event.target.value || 0),
                            }))
                          }
                          className="max-w-32"
                        />
                        <span className="text-slate-200">%</span>
                      </div>
                      <p className="text-xs text-slate-300">Specify percentage approvers required to approve the request.</p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-slate-200 font-medium">Approver Steps</p>
                      {form.steps.map((step, index) => (
                        <div key={`${step.designation}-${index}`} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-5">
                            <select
                              value={step.designation}
                              onChange={(event) => handleStepChange(index, "designation", event.target.value)}
                              className="w-full h-10 rounded-lg border border-slate-700 bg-slate-900/50 px-3 text-slate-100"
                            >
                              {STEP_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-4 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={step.required}
                              onChange={(event) => handleStepChange(index, "required", event.target.checked)}
                              className="h-5 w-5 rounded border border-slate-500 bg-slate-950 accent-blue-500"
                            />
                            <span className="text-slate-300 text-sm">Required</span>
                          </div>
                          <div className="col-span-3 text-right">
                            <Button
                              type="button"
                              variant="destructive"
                              className="bg-red-600 text-white hover:bg-red-500"
                              onClick={() => handleRemoveStep(index)}
                              disabled={form.steps.length <= 1}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}

                      {matchingApprovers.length > 0 && (
                        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                          <p className="text-slate-100 text-sm font-medium">Approvers found for selected designations</p>
                          {matchingApprovers.map((approver) => {
                            const name = `${approver.firstName || ""} ${approver.lastName || ""}`.trim() || approver.email
                            const isRequiredApprover = form.requiredApproverIds.includes(approver.id)
                            return (
                              <label key={approver.id} className="flex items-center justify-between gap-3 rounded border border-slate-800 px-3 py-2">
                                <span className="text-slate-200 text-sm">{name} ({approver.designation})</span>
                                <span className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isRequiredApprover}
                                    onChange={(event) => handleRequiredApproverToggle(approver.id, event.target.checked)}
                                    className="h-5 w-5 rounded border border-slate-500 bg-slate-950 accent-blue-500"
                                  />
                                  <span className="text-slate-300 text-sm">Required</span>
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="text-slate-100 border-slate-600 hover:bg-slate-800" onClick={handleAddStep}>
                        Add Step
                      </Button>
                      <Button
                        type="button"
                        className="bg-blue-600 text-white hover:bg-blue-500"
                        onClick={handleSaveRule}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save Rule"}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-300">
                      Add Step means adding another approver designation to the rule flow (for example FINANCE, then DIRECTOR, then CFO).
                    </p>
                    <p className="text-xs text-slate-300">
                      Selecting MANAGER or DIRECTOR automatically adds CFO in the list. Use the Required checkbox beside each designation to make that approval mandatory.
                    </p>
                    <p className="text-xs text-slate-300">
                      When MANAGER is selected, all active manager approvers are included. If you check Required for a specific manager in the list above, that manager approval becomes mandatory.
                    </p>
                    <p className="text-xs text-slate-300">
                      If you want CFO approval to be mandatory for validity, keep a CFO step and check Required for that step.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

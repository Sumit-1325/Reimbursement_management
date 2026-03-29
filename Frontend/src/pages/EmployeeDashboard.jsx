import React from "react"
import { Upload, PlusCircle, Clock3, CheckCircle2, FileText } from "lucide-react"
import Navbar from "@/components/layout/Navbar"
import SideNavbar from "@/components/layout/SideNavbar"
import PageBreadcrumb from "@/components/layout/PageBreadcrumb"
import { useUser } from "@/context/UserContext"
import { toast } from "sonner"
import { employeeApi } from "@/api/employeeApi"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function statusBadgeVariant(status) {
  if (status === "DRAFT") return "destructive"
  if (status === "SUBMITTED") return "secondary"
  if (status === "WAITING_APPROVAL") return "outline"
  if (status === "REJECTED") return "destructive"
  return "default"
}

function statusLabel(status) {
  if (status === "WAITING_APPROVAL") return "Waiting Approval"
  if (status === "REJECTED") return "Rejected"
  return status.charAt(0) + status.slice(1).toLowerCase()
}

function statusBadgeClass(status) {
  if (status === "DRAFT") return "bg-red-500/20 text-red-200 border-red-500/40"
  if (status === "SUBMITTED") return "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
  if (status === "WAITING_APPROVAL") return "bg-amber-500/20 text-amber-200 border-amber-500/40"
  if (status === "REJECTED") return "bg-rose-500/20 text-rose-200 border-rose-500/40"
  return "bg-blue-500/20 text-blue-200 border-blue-500/40"
}

function formatCurrency(amount, currency = "INR") {
  return `${currency} ${Number(amount || 0).toLocaleString("en-IN")}`
}

function formatDate(value) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function extractErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  )
}

export default function EmployeeDashboard() {
  const { user } = useUser()
  const [loading, setLoading] = React.useState(true)
  const [loadingEmployees, setLoadingEmployees] = React.useState(true)
  const [loadingCurrencies, setLoadingCurrencies] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [expenses, setExpenses] = React.useState([])
  const [companyEmployees, setCompanyEmployees] = React.useState([])
  const [currencyOptions, setCurrencyOptions] = React.useState([])
  const [summary, setSummary] = React.useState({
    draftAmountInBaseCurrency: 0,
    waitingApprovalAmountInBaseCurrency: 0,
    approvedAmountInBaseCurrency: 0,
    baseCurrency: "INR",
  })
  const [showNewExpenseForm, setShowNewExpenseForm] = React.useState(false)
  const [formSubmitted, setFormSubmitted] = React.useState(false)
  const [draftForm, setDraftForm] = React.useState({
    description: "",
    expenseDate: "",
    category: "TRAVEL",
    paidBy: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "",
    amount: "",
    currencyCode: "INR",
    remarks: "",
    notes: "",
  })

  const draftProgressLabel = formSubmitted
    ? "Draft > Waiting approval > Approved"
    : "Draft > Waiting approval > Approved"

  const employeeName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.firstName || "Employee"

  const loadExpenses = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await employeeApi.getMyExpenses()
      setExpenses(response?.data?.expenses || [])
      setSummary(
        response?.data?.summary || {
          draftAmountInBaseCurrency: 0,
          waitingApprovalAmountInBaseCurrency: 0,
          approvedAmountInBaseCurrency: 0,
          baseCurrency: "INR",
        }
      )
    } catch (error) {
      toast.error(extractErrorMessage(error, "Failed to fetch employee expenses"))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCompanyEmployees = React.useCallback(async () => {
    setLoadingEmployees(true)
    try {
      const response = await employeeApi.getCompanyEmployees()
      const employees = response?.data?.employees || []
      setCompanyEmployees(employees)

      if (employees.length > 0) {
        const myEmail = String(user?.email || "").toLowerCase()
        const currentEmployee = employees.find((item) => String(item.email || "").toLowerCase() === myEmail)
        setDraftForm((prev) => ({
          ...prev,
          paidBy: currentEmployee?.name || prev.paidBy || employees[0].name,
        }))
      }
    } catch (error) {
      toast.error(extractErrorMessage(error, "Failed to fetch employee list"))
    } finally {
      setLoadingEmployees(false)
    }
  }, [user?.email])

  const loadSupportedCurrencies = React.useCallback(async () => {
    setLoadingCurrencies(true)
    try {
      const response = await employeeApi.getSupportedCurrencies()
      const currencies = response?.data?.currencies || []
      const baseCurrency = response?.data?.baseCurrency || "INR"

      setCurrencyOptions(currencies)
      setDraftForm((prev) => ({
        ...prev,
        currencyCode: prev.currencyCode || baseCurrency,
      }))
    } catch (error) {
      toast.error(extractErrorMessage(error, "Failed to fetch supported currencies"))
      setCurrencyOptions([])
    } finally {
      setLoadingCurrencies(false)
    }
  }, [])

  React.useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  React.useEffect(() => {
    loadCompanyEmployees()
  }, [loadCompanyEmployees])

  React.useEffect(() => {
    loadSupportedCurrencies()
  }, [loadSupportedCurrencies])

  React.useEffect(() => {
    setDraftForm((prev) => ({
      ...prev,
      paidBy: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || prev.paidBy,
    }))
  }, [user?.firstName, user?.lastName])

  const handleSubmitExpense = async () => {
    if (!draftForm.description.trim()) {
      toast.error("Description is required")
      return
    }

    if (!draftForm.amount || Number(draftForm.amount) <= 0) {
      toast.error("Amount must be greater than 0")
      return
    }

    setIsSubmitting(true)
    try {
      await employeeApi.createExpense({
        description: draftForm.description.trim(),
        expenseDate: draftForm.expenseDate || undefined,
        category: draftForm.category,
        amount: Number(draftForm.amount),
        currencyCode: draftForm.currencyCode,
        paidBy: draftForm.paidBy,
        remarks: draftForm.remarks,
        submit: true,
      })

      toast.success("Expense submitted successfully")
      setFormSubmitted(true)
      setDraftForm((prev) => ({
        ...prev,
        description: "",
        expenseDate: "",
        amount: "",
        remarks: "",
        notes: "",
      }))
      await loadExpenses()
    } catch (error) {
      toast.error(extractErrorMessage(error, "Failed to submit expense"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen bg-slate-950">
      <SideNavbar hideUsers={true} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar hideUsers={true} />

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            <PageBreadcrumb
              items={[{ label: "Home", to: "/employee-dashboard" }]}
              current="Employee Dashboard"
            />

            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Employee Dashboard</h1>
              <p className="text-slate-400">
                Upload receipts, create new claims, and track your past requests.
              </p>
            </div>

            <Card className="bg-slate-900/80 border-slate-800">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-white">Claims Actions</CardTitle>
                  <CardDescription className="text-white">
                    Create and manage expense claims with OCR-based receipt upload.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 border-slate-600 text-slate-100 hover:bg-slate-800 hover:text-white"
                  >
                    <Upload className="w-4 h-4" />
                    Upload
                  </Button>
                  <Button
                    type="button"
                    className="gap-2 bg-blue-600 text-white hover:bg-blue-500"
                    onClick={() => {
                      setShowNewExpenseForm((prev) => !prev)
                      setFormSubmitted(false)
                    }}
                  >
                    <PlusCircle className="w-4 h-4" />
                    New
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-slate-400 text-xs">Draft Amount</p>
                    <p className="text-white text-2xl font-bold mt-1">
                      {formatCurrency(summary.draftAmountInBaseCurrency, summary.baseCurrency)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-slate-400 text-xs">Waiting Approval Amount</p>
                    <p className="text-white text-2xl font-bold mt-1">
                      {formatCurrency(summary.waitingApprovalAmountInBaseCurrency, summary.baseCurrency)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-slate-400 text-xs">Approved Amount</p>
                    <p className="text-white text-2xl font-bold mt-1">
                      {formatCurrency(summary.approvedAmountInBaseCurrency, summary.baseCurrency)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {showNewExpenseForm && (
              <Card className="bg-slate-900/80 border-slate-700">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-white">New Expense Request</CardTitle>
                    <CardDescription className="text-slate-300">
                      Fill details, attach receipt, and submit for approval.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-slate-100 border-slate-600">
                    {draftProgressLabel}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outline" className="border-slate-600 text-slate-100">
                      Attach Receipt
                    </Button>
                    <p className="text-xs text-slate-400">
                      OCR-backed receipt extraction will be connected in the next step.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-200">Description</Label>
                      <Input
                        value={draftForm.description}
                        onChange={(event) =>
                          setDraftForm((prev) => ({ ...prev, description: event.target.value }))
                        }
                        placeholder="Expense description"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-200">Expense Date</Label>
                      <Input
                        type="date"
                        value={draftForm.expenseDate}
                        onChange={(event) =>
                          setDraftForm((prev) => ({ ...prev, expenseDate: event.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-200">Category</Label>
                      <select
                        value={draftForm.category}
                        onChange={(event) =>
                          setDraftForm((prev) => ({ ...prev, category: event.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900/50 px-3 text-sm text-slate-100"
                      >
                        <option value="TRAVEL">Travel</option>
                        <option value="MEALS">Meals</option>
                        <option value="ACCOMMODATION">Accommodation</option>
                        <option value="OFFICE_SUPPLIES">Office Supplies</option>
                        <option value="TRANSPORT">Transport</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-200">Paid by</Label>
                      <select
                        value={draftForm.paidBy}
                        onChange={(event) =>
                          setDraftForm((prev) => ({ ...prev, paidBy: event.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900/50 px-3 text-sm text-slate-100"
                        disabled={loadingEmployees || companyEmployees.length === 0}
                      >
                        {companyEmployees.length === 0 ? (
                          <option value="">No employees available</option>
                        ) : (
                          companyEmployees.map((item) => (
                            <option key={item.id} value={item.name}>
                              {item.name} ({item.designation})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-200">Total amount</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draftForm.amount}
                          onChange={(event) =>
                            setDraftForm((prev) => ({ ...prev, amount: event.target.value }))
                          }
                          placeholder="0.00"
                          className="col-span-2"
                        />
                        <select
                          value={draftForm.currencyCode}
                          onChange={(event) =>
                            setDraftForm((prev) => ({ ...prev, currencyCode: event.target.value }))
                          }
                          className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900/50 px-3 text-sm text-slate-100"
                          disabled={loadingCurrencies}
                        >
                          {currencyOptions.length === 0 ? (
                            <option value={draftForm.currencyCode || "INR"}>{draftForm.currencyCode || "INR"}</option>
                          ) : (
                            currencyOptions.map((item) => (
                              <option key={item.code} value={item.code}>
                                {item.code}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                      <p className="text-xs text-slate-500">
                        Employee can submit in receipt currency. Manager view will use company base-currency conversion.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-200">Remarks</Label>
                      <Input
                        value={draftForm.remarks}
                        onChange={(event) =>
                          setDraftForm((prev) => ({ ...prev, remarks: event.target.value }))
                        }
                        placeholder="Short remarks"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200">Description</Label>
                    <Textarea
                      value={draftForm.notes}
                      onChange={(event) =>
                        setDraftForm((prev) => ({ ...prev, notes: event.target.value }))
                      }
                      placeholder="Add additional context"
                    />
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                    <h4 className="text-slate-100 font-medium mb-3">Approval Log</h4>
                    <Table className="[&_th]:!text-slate-300 [&_td]:!text-slate-200">
                      <TableHeader>
                        <TableRow className="border-slate-800">
                          <TableHead>Approver</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formSubmitted ? (
                          <TableRow className="border-slate-800">
                            <TableCell>Sarah</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-amber-200 border-amber-500/40 bg-amber-500/20">
                                Waiting Approval
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date().toLocaleString()}</TableCell>
                          </TableRow>
                        ) : (
                          <TableRow className="border-slate-800">
                            <TableCell colSpan={3} className="text-slate-400 text-center py-4">
                              No approval history yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {!formSubmitted ? (
                    <Button
                      type="button"
                      className="bg-blue-600 text-white hover:bg-blue-500"
                      disabled={isSubmitting}
                      onClick={handleSubmitExpense}
                    >
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </Button>
                  ) : (
                    <p className="text-sm text-amber-300">
                      Request submitted. Submit button is hidden until review is completed.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="bg-slate-900/80 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Your Past Requests</CardTitle>
                <CardDescription className="text-white">
                  Showing only {employeeName}'s expense requests.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-slate-400">Loading requests...</p>
                ) : (
                <Table className="[&_th]:!text-slate-300 [&_td]:!text-slate-200">
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-300">Employee</TableHead>
                      <TableHead className="text-slate-300">Description</TableHead>
                      <TableHead className="text-slate-300">Date</TableHead>
                      <TableHead className="text-slate-300">Category</TableHead>
                      <TableHead className="text-slate-300">Paid By</TableHead>
                      <TableHead className="text-slate-300">Remarks</TableHead>
                      <TableHead className="text-slate-300">Amount</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id} className="border-slate-800 hover:bg-slate-900/60">
                        <TableCell className="text-slate-100">{employeeName}</TableCell>
                        <TableCell className="text-slate-200">{expense.description}</TableCell>
                        <TableCell className="text-slate-300">{formatDate(expense.date)}</TableCell>
                        <TableCell className="text-slate-300">{expense.category}</TableCell>
                        <TableCell className="text-slate-300">{expense.paidBy}</TableCell>
                        <TableCell className="text-slate-300">{expense.remarks}</TableCell>
                        <TableCell className="text-slate-100 font-medium">
                          {formatCurrency(expense.amount, expense.currencyCode)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusBadgeVariant(expense.uiState)}
                            className={statusBadgeClass(expense.uiState)}
                          >
                            {statusLabel(expense.uiState)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {expenses.length === 0 && (
                      <TableRow className="border-slate-800">
                        <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                          No past requests found for this employee.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                )}

                <div className="mt-4 flex items-center gap-4 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <Clock3 className="w-4 h-4" />
                    <span>Waiting requests follow approval rules.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approved claims are finalized.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Data shown is dummy for UI preview.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

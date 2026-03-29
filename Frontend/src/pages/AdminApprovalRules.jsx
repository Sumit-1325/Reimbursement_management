import { useEffect, useState } from "react"
import Navbar from "@/components/layout/Navbar"
import SideNavbar from "@/components/layout/SideNavbar"
import PageBreadcrumb from "@/components/layout/PageBreadcrumb"
import { useUser } from "@/context/UserContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const DUMMY_CLAIMS = [
  {
    id: "CLM-1001",
    employeeName: "Aman Verma",
    department: "Sales",
    amount: "INR 3,450",
    expenseType: "Travel",
    submittedAt: "2 hours ago",
    status: "PENDING",
  },
  {
    id: "CLM-1002",
    employeeName: "Neha Sharma",
    department: "Marketing",
    amount: "INR 1,980",
    expenseType: "Meals",
    submittedAt: "5 hours ago",
    status: "PENDING",
  },
  {
    id: "CLM-1003",
    employeeName: "Rohit Gupta",
    department: "Operations",
    amount: "INR 7,200",
    expenseType: "Accommodation",
    submittedAt: "Yesterday",
    status: "PENDING",
  },
]

export default function AdminApprovalRules() {
  const { user } = useUser()
  const [selectedClaim, setSelectedClaim] = useState(DUMMY_CLAIMS[0])
  const [form, setForm] = useState({
    user: DUMMY_CLAIMS[0].employeeName,
    ruleDescription: "Approval rule for miscellaneous expenses",
    manager: "Sarah",
    isManagerApprover: true,
    approvers: [
      { name: "John", required: true },
      { name: "Mitchell", required: false },
      { name: "Andreas", required: false },
    ],
    useApproverSequence: true,
    minimumApprovalPercentage: 60,
  })

  useEffect(() => {
    setForm((previous) => ({
      ...previous,
      user: selectedClaim.employeeName,
    }))
  }, [selectedClaim])

  const handleApproverChange = (index, key, value) => {
    setForm((previous) => {
      const nextApprovers = [...previous.approvers]
      nextApprovers[index] = {
        ...nextApprovers[index],
        [key]: value,
      }
      return {
        ...previous,
        approvers: nextApprovers,
      }
    })
  }

  const addApprover = () => {
    setForm((previous) => ({
      ...previous,
      approvers: [...previous.approvers, { name: "", required: false }],
    }))
  }

  const removeApprover = (index) => {
    setForm((previous) => ({
      ...previous,
      approvers: previous.approvers.filter((_, i) => i !== index),
    }))
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
                Admin view for configuring claim approval rules. This screen is dummy for now.
              </p>
            </div>

            <Card className="bg-slate-900/80 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Employee Claim Requests</CardTitle>
                <CardDescription>
                  Select a claim to configure approval rules for that user.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {DUMMY_CLAIMS.map((claim) => (
                  <button
                    key={claim.id}
                    type="button"
                    onClick={() => setSelectedClaim(claim)}
                    className={`rounded-lg border p-4 text-left transition ${
                      selectedClaim.id === claim.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-800 bg-slate-900/60 hover:border-blue-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-slate-100 font-medium">{claim.employeeName}</p>
                      <Badge variant="outline">{claim.status}</Badge>
                    </div>
                    <p className="text-slate-300 text-sm">{claim.expenseType} • {claim.amount}</p>
                    <p className="text-slate-500 text-xs mt-1">{claim.id} • {claim.submittedAt}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-6 md:p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Admin View (Approval Rules)</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">User</label>
                    <input
                      value={form.user}
                      readOnly
                      className="w-full h-10 rounded-md border border-slate-700 bg-slate-900/60 px-3 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Description about rules</label>
                    <input
                      value={form.ruleDescription}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, ruleDescription: event.target.value }))
                      }
                      className="w-full h-10 rounded-md border border-slate-700 bg-slate-900/60 px-3 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Manager</label>
                    <select
                      value={form.manager}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, manager: event.target.value }))
                      }
                      className="w-full h-10 rounded-md border border-slate-700 bg-slate-900/60 px-3 text-slate-100"
                    >
                      <option>Sarah</option>
                      <option>Marc</option>
                      <option>John</option>
                      <option>Mitchell</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-2">
                      Dynamic dropdown: default manager comes from user profile and can be changed for this approval.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex items-start gap-3 rounded-md border border-slate-800 bg-slate-900/50 p-3">
                    <input
                      type="checkbox"
                      checked={form.isManagerApprover}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, isManagerApprover: event.target.checked }))
                      }
                      className="mt-1 h-5 w-5"
                    />
                    <div>
                      <p className="text-slate-100 font-medium">Is manager an approver?</p>
                      <p className="text-xs text-slate-400 mt-1">
                        If checked, request goes to the selected manager first before other approvers.
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-slate-300 mb-3">Approvers</p>
                    <div className="space-y-2">
                      {form.approvers.map((approver, index) => (
                        <div key={`approver-${index}`} className="grid grid-cols-12 gap-2 items-center">
                          <span className="col-span-1 text-slate-400">{index + 1}</span>
                          <input
                            value={approver.name}
                            onChange={(event) => handleApproverChange(index, "name", event.target.value)}
                            className="col-span-7 h-10 rounded-md border border-slate-700 bg-slate-900/60 px-3 text-slate-100"
                            placeholder={`Approver ${index + 1}`}
                          />
                          <label className="col-span-2 flex items-center gap-2 text-xs text-slate-300">
                            <input
                              type="checkbox"
                              checked={approver.required}
                              onChange={(event) => handleApproverChange(index, "required", event.target.checked)}
                              className="h-4 w-4"
                            />
                            Required
                          </label>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeApprover(index)}
                            disabled={form.approvers.length <= 1}
                            className="col-span-2"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline" onClick={addApprover} className="mt-3">
                      Add Approver
                    </Button>
                  </div>

                  <div className="flex items-start gap-3 rounded-md border border-slate-800 bg-slate-900/50 p-3">
                    <input
                      type="checkbox"
                      checked={form.useApproverSequence}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, useApproverSequence: event.target.checked }))
                      }
                      className="mt-1 h-5 w-5"
                    />
                    <div>
                      <p className="text-slate-100 font-medium">Approvers Sequence</p>
                      <p className="text-xs text-slate-400 mt-1">
                        If checked, requests move one-by-one in order. If unchecked, all approvers are notified at once.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Minimum approval percentage</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={form.minimumApprovalPercentage}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            minimumApprovalPercentage: Number(event.target.value || 0),
                          }))
                        }
                        className="w-32 h-10 rounded-md border border-slate-700 bg-slate-900/60 px-3 text-slate-100"
                      />
                      <span className="text-slate-300">%</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Specify the percentage of approvers required for the request to be approved.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button type="button">Save Rule (Dummy)</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

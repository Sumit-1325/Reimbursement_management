import React from "react"
import { useNavigate } from "react-router-dom"
import {
  Activity,
} from "lucide-react"
import Navbar from "@/components/layout/Navbar"
import SideNavbar from "@/components/layout/SideNavbar"
import PageBreadcrumb from "@/components/layout/PageBreadcrumb"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { useUser } from "@/context/UserContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { adminApi } from "@/api/adminApi"
import { toast } from "sonner"

export default function AdminDashboard() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [loadingClaims, setLoadingClaims] = React.useState(true)
  const [pendingClaims, setPendingClaims] = React.useState([])
  const [recentActivities, setRecentActivities] = React.useState([])

  const loadDashboardData = React.useCallback(async () => {
    setLoadingClaims(true)
    try {
      const [pendingResponse, activitiesResponse] = await Promise.all([
        adminApi.getPendingExpenses(),
        adminApi.getRecentActivities(),
      ])

      setPendingClaims(pendingResponse?.data?.expenses || [])
      setRecentActivities(activitiesResponse?.data?.activities || [])
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to load dashboard activity"
      toast.error(message)
    } finally {
      setLoadingClaims(false)
    }
  }, [])

  React.useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const formatAmount = (amount, currencyCode) => {
    const numericAmount = Number(amount || 0)
    return `${currencyCode || "INR"} ${numericAmount.toLocaleString("en-IN")}`
  }

  const formatSubmittedAt = (value) => {
    if (!value) return "-"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "-"
    return date.toLocaleString()
  }

  const mergedActivityFeed = recentActivities.map((item) => ({
    user: item.actor || "System",
    avatar: "",
    action: item.action || "updated the system",
    timestamp: formatSubmittedAt(item.at),
    type: item.type || "default",
  }))

  return (
    <div className="flex h-screen bg-slate-950">
      <SideNavbar hideUsers={user?.role !== "ADMIN"} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <Navbar hideUsers={user?.role !== "ADMIN"} />

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10 opacity-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -z-10 opacity-20 pointer-events-none"></div>

          <div className="max-w-7xl mx-auto p-6 relative z-10">
            {/* Breadcrumb */}
            <div className="mb-8">
              <PageBreadcrumb
                items={[{ label: "Home", to: "/admin-dashboard" }]}
                current="Admin Dashboard"
              />
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Admin Dashboard
              </h1>
              <p className="text-slate-400">
                Manage employee claims and approval setup
              </p>
            </div>

            <div className="mb-8 rounded-lg border border-slate-800 bg-slate-900/80 backdrop-blur-sm border-l-4 border-l-blue-600">
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Employee Claim Requests</h3>
                  <p className="text-sm text-slate-400">Live pending claims from database</p>
                </div>
                <Button
                  type="button"
                  className="bg-blue-600 text-white hover:bg-blue-500"
                  onClick={() => navigate("/approval-rules")}
                >
                  Open Pending Requests
                </Button>
              </div>
              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {loadingClaims ? (
                  <p className="text-slate-400 text-sm">Loading pending claims...</p>
                ) : pendingClaims.length === 0 ? (
                  <p className="text-slate-400 text-sm">No pending claims found.</p>
                ) : (
                  pendingClaims.map((claim) => {
                    const employeeName = `${claim.employee?.firstName || ""} ${claim.employee?.lastName || ""}`.trim() || "Unknown"
                    return (
                      <button
                        key={claim.id}
                        type="button"
                        onClick={() => navigate("/approval-rules")}
                        className="text-left rounded-lg border border-slate-700 bg-slate-900/60 p-4 hover:border-blue-500/50 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-slate-100 font-medium">{employeeName}</p>
                          <Badge variant="outline" className="text-amber-200 border-amber-500/40 bg-amber-500/20">PENDING</Badge>
                        </div>
                        <p className="text-sm text-slate-300">
                          {(claim.category || "Other").toString().replaceAll("_", " ")} • {formatAmount(claim.amount, claim.currencyCode)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{claim.id} • {formatSubmittedAt(claim.submittedAt)}</p>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6">
              <div>
                <ActivityFeed
                  title="Recent Activity"
                  description="Latest approval rule and claim updates"
                  activities={mergedActivityFeed}
                  maxHeight="max-h-96"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

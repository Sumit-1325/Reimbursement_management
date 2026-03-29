import React from "react"
import { useNavigate } from "react-router-dom"
import {
  Activity,
  UserPlus,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react"
import Navbar from "@/components/layout/Navbar"
import SideNavbar from "@/components/layout/SideNavbar"
import PageBreadcrumb from "@/components/layout/PageBreadcrumb"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { useUser } from "@/context/UserContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function AdminDashboard() {
  const { user } = useUser()
  const navigate = useNavigate()

  const dummyClaimRequests = [
    {
      id: "CLM-1001",
      employee: "Aman Verma",
      type: "Travel",
      amount: "INR 3,450",
      submittedAt: "2 hours ago",
      status: "PENDING",
    },
    {
      id: "CLM-1002",
      employee: "Neha Sharma",
      type: "Meals",
      amount: "INR 1,980",
      submittedAt: "5 hours ago",
      status: "PENDING",
    },
    {
      id: "CLM-1003",
      employee: "Rohit Gupta",
      type: "Accommodation",
      amount: "INR 7,200",
      submittedAt: "Yesterday",
      status: "PENDING",
    },
  ]

  // Sample activity data - in real app, this could come from a separate endpoint
  const activityFeed = [
    {
      user: "System",
      avatar: "",
      action: "completed database backup",
      timestamp: "1 hour ago",
      type: "success",
    },
  ]

  // Sample quick actions
  const quickActions = [
    {
      icon: UserPlus,
      label: "Invite User",
      description: "Send invitation to new team member",
      onClick: () => alert("Invite User clicked"),
    },
    {
      icon: FileText,
      label: "Pending Requests",
      description: "Configure approval rules and generate approval chains",
      onClick: () => navigate("/approval-rules"),
    },
    {
      icon: BarChart3,
      label: "View Analytics",
      description: "Detailed analytics dashboard",
      onClick: () => alert("View Analytics clicked"),
    },
    {
      icon: Settings,
      label: "Settings",
      description: "Configure system settings",
      onClick: () => alert("Settings clicked"),
    },
  ]

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
                  <p className="text-sm text-slate-400">Dummy pending claims for UI preview</p>
                </div>
                <Button
                  type="button"
                  onClick={() => navigate("/approval-rules")}
                >
                  Open Pending Requests
                </Button>
              </div>
              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {dummyClaimRequests.map((claim) => (
                  <button
                    key={claim.id}
                    type="button"
                    onClick={() => navigate("/approval-rules")}
                    className="text-left rounded-lg border border-slate-700 bg-slate-900/60 p-4 hover:border-blue-500/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-100 font-medium">{claim.employee}</p>
                      <Badge variant="outline">{claim.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-300">{claim.type} • {claim.amount}</p>
                    <p className="text-xs text-slate-500 mt-1">{claim.id} • {claim.submittedAt}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Activity Feed - takes 2 columns on large screens */}
              <div className="lg:col-span-2">
                <ActivityFeed
                  title="Recent Activity"
                  description="Latest updates from your system"
                  activities={activityFeed}
                  maxHeight="max-h-96"
                />
              </div>

              {/* Quick Actions - takes 1 column on large screens */}
              <div>
                <QuickActions
                  title="Quick Actions"
                  description="Fast access to common tasks"
                  actions={quickActions}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from "react"
import {
  UsersIcon,
  Activity,
  TrendingUpIcon,
  Zap,
  UserPlus,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react"
import { toast } from "sonner"
import Navbar from "@/components/layout/Navbar"
import SideNavbar from "@/components/layout/SideNavbar"
import PageBreadcrumb from "@/components/layout/PageBreadcrumb"
import StatCard from "@/components/dashboard/StatCard"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { useUser } from "@/context/UserContext"

export default function AdminDashboard() {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)

  // Dummy data for admin dashboard
  const dashboardData = {
    totalUsers: 42,
    activeUsers: 28,
    admins: 3,
    participants: 39,
    users: [],
  }

  // Dynamic stats based on real data
  const stats = dashboardData ? [
    {
      icon: UsersIcon,
      title: "Total Users",
      value: dashboardData.totalUsers.toString(),
      change: dashboardData.totalUsers > 100 ? 12 : 5,
      trend: "up",
      bgColor: "bg-blue-500/10",
      borderColor: "border-l-blue-600",
      textColor: "text-blue-400",
      subtitle: `${dashboardData.activeUsers} active`,
    },
    {
      icon: Activity,
      title: "Active Sessions",
      value: dashboardData.activeUsers.toString(),
      change: 8,
      trend: "up",
      bgColor: "bg-green-500/10",
      borderColor: "border-l-green-600",
      textColor: "text-green-400",
      subtitle: "Currently online",
    },
    {
      icon: TrendingUpIcon,
      title: "Admin Users",
      value: dashboardData.admins.toString(),
      change: 5,
      trend: "up",
      bgColor: "bg-purple-500/10",
      borderColor: "border-l-purple-600",
      textColor: "text-purple-400",
      subtitle: "System administrators",
    },
    {
      icon: Zap,
      title: "Participants",
      value: dashboardData.participants.toString(),
      change: 12,
      trend: "up",
      bgColor: "bg-orange-500/10",
      borderColor: "border-l-orange-600",
      textColor: "text-orange-400",
      subtitle: "Regular users",
    },
  ] : []

  // Sample activity data - in real app, this could come from a separate endpoint
  const activityFeed = dashboardData ? [
    ...dashboardData.users.slice(0, 3).map((u) => ({
      user: `${u.firstName} ${u.lastName || ""}`,
      avatar: u.avatar || "",
      action: `joined as ${u.role === "ADMIN" ? "admin" : "participant"}`,
      timestamp: new Date(u.createdAt).toLocaleDateString(),
      type: "success",
    })),
    {
      user: "System",
      avatar: "",
      action: "completed database backup",
      timestamp: "1 hour ago",
      type: "success",
    },
  ] : []

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
      label: "Create Report",
      description: "Generate system report",
      onClick: () => alert("Create Report clicked"),
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
                System overview and management tools
              </p>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, idx) => (
                <StatCard key={idx} {...stat} />
              ))}
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

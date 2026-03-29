import React from "react"
import {
  CalendarDays,
  CheckCircle,
  AlertCircle,
  Trophy,
  BookOpen,
  Bell,
  LogOut,
} from "lucide-react"
import Navbar from "@/components/layout/Navbar"
import SideNavbar from "@/components/layout/SideNavbar"
import PageBreadcrumb from "@/components/layout/PageBreadcrumb"
import StatCard from "@/components/dashboard/StatCard"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { useUser } from "@/context/UserContext"

export default function UserDashboard() {
  const { user } = useUser()
  // User-focused stat data
  const stats = [
    {
      icon: CalendarDays,
      title: "My Events",
      value: "8",
      change: 2,
      trend: "up",
      bgColor: "bg-blue-500/10",
      borderColor: "border-l-blue-600",
      textColor: "text-blue-400",
      subtitle: "Registered events",
    },
    {
      icon: CheckCircle,
      title: "Completed",
      value: "6",
      change: 1,
      trend: "up",
      bgColor: "bg-green-500/10",
      borderColor: "border-l-green-600",
      textColor: "text-green-400",
      subtitle: "Finished events",
    },
    {
      icon: AlertCircle,
      title: "Pending",
      value: "2",
      change: 0,
      trend: "down",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-l-yellow-600",
      textColor: "text-yellow-400",
      subtitle: "Upcoming events",
    },
    {
      icon: Trophy,
      title: "Points",
      value: "450",
      change: 35,
      trend: "up",
      bgColor: "bg-purple-500/10",
      borderColor: "border-l-purple-600",
      textColor: "text-purple-400",
      subtitle: "Total earned",
    },
  ]

  // User-focused activity data
  const activityFeed = [
    {
      user: "You",
      avatar: "https://github.com/shadcn.png",
      action: "registered for React Workshop",
      timestamp: "2 mins ago",
      type: "success",
    },
    {
      user: "Event Team",
      avatar: "",
      action: "sent you a reminder for Web Dev Bootcamp",
      timestamp: "30 mins ago",
      type: "default",
    },
    {
      user: "You",
      avatar: "",
      action: "completed JavaScript Fundamentals",
      timestamp: "2 hours ago",
      type: "success",
    },
    {
      user: "System",
      avatar: "",
      action: "congratulated you for earning 50 points",
      timestamp: "5 hours ago",
      type: "success",
    },
    {
      user: "Event Team",
      avatar: "",
      action: "updated details for Python Advanced",
      timestamp: "1 day ago",
      type: "default",
    },
  ]

  // User-focused quick actions
  const quickActions = [
    {
      icon: CalendarDays,
      label: "Browse Events",
      description: "Explore upcoming events",
      onClick: () => alert("Browse Events clicked"),
    },
    {
      icon: BookOpen,
      label: "My Registrations",
      description: "View registered events",
      onClick: () => alert("My Registrations clicked"),
    },
    {
      icon: Bell,
      label: "Notifications",
      description: "View all notifications",
      onClick: () => alert("Notifications clicked"),
    },
    {
      icon: LogOut,
      label: "Logout",
      description: "Sign out from your account",
      onClick: () => alert("Logout clicked"),
    },
  ]

  return (
    <div className="flex h-screen bg-slate-950">
      <SideNavbar hideUsers={user?.role !== 'ADMIN'} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <Navbar hideUsers={user?.role !== 'ADMIN'} />

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10 opacity-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -z-10 opacity-20 pointer-events-none"></div>

          <div className="max-w-7xl mx-auto p-6 relative z-10">
            {/* Breadcrumb */}
            <div className="mb-8">
              <PageBreadcrumb
                items={[{ label: "Home", to: "/dashboard" }]}
                current="My Dashboard"
              />
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome to Your Dashboard
              </h1>
              <p className="text-slate-400">
                Manage your events and track your progress
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
                  title="Your Activity"
                  description="Your recent event registrations and completions"
                  activities={activityFeed}
                  maxHeight="max-h-96"
                />
              </div>

              {/* Quick Actions - takes 1 column on large screens */}
              <div>
                <QuickActions
                  title="Quick Actions"
                  description="Fast access to your features"
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

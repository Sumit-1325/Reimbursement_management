import { NavLink, useNavigate } from "react-router-dom"
import { memo, useState } from "react"
import { Activity, BarChart3, FileText, Settings, UsersIcon } from "lucide-react"
import { FiLogOut } from "react-icons/fi"
import { cn } from "@/lib/utils"
import { useUser } from "@/context/UserContext"
import { authApi } from "@/api/authApi"

function navLinkClass({ isActive }) {
  return cn(
    "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
    isActive
      ? "bg-blue-600/20 text-blue-200 border border-blue-500/30"
      : "text-slate-300 hover:bg-slate-800"
  )
}

function SideNavbar({ hideUsers = false }) {
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { logout, user } = useUser()

  const handleLogout = () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)

    // Optimistic logout for instant UX.
    logout()
    navigate("/login", { replace: true })

    // Best-effort server logout in background.
    authApi.logout().catch((err) => {
      console.error("Logout API error:", err)
    })
  }
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
      <button
        onClick={() => {
          const route = user?.role === "ADMIN" ? "/admin-dashboard" : "/user-dashboard"
          navigate(route)
        }}
        className="h-16 border-b border-slate-800 flex items-center px-4 gap-3 hover:bg-slate-800/50 transition-colors cursor-pointer w-full"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">MD</span>
        </div>
        <div>
          <p className="font-bold text-white text-sm">Management</p>
          <p className="text-xs text-slate-400">System</p>
        </div>
      </button>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        <div>
          <p className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Main
          </p>
          <div className="space-y-1">
            <NavLink to="/dashboard" className={navLinkClass}>
              <BarChart3 className="w-4 h-4 flex-shrink-0" />
              <span>Dashboard</span>
            </NavLink>
            {!hideUsers && (
              <NavLink to="/users" className={navLinkClass}>
                <UsersIcon className="w-4 h-4 flex-shrink-0" />
                <span>Users</span>
              </NavLink>
            )}
            <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-all text-sm font-medium">
              <Activity className="w-4 h-4 flex-shrink-0" />
              <span>Activity</span>
            </button>
          </div>
        </div>

        <div>
          <p className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Management
          </p>
          <div className="space-y-1">
            <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-all text-sm font-medium">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span>Reports</span>
            </button>
            <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-all text-sm font-medium">
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="h-16 border-t border-slate-800 flex items-center px-2">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          type="button"
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-300 hover:bg-red-900/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm font-medium"
        >
          <FiLogOut className="w-4 h-4 flex-shrink-0" />
          <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
        </button>
      </div>
    </aside>
  )
}

export default memo(SideNavbar)

import React from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { UserProvider } from "@/context/UserContext"
import { useUser } from "@/context/UserContext"
import LoginPage from "@/pages/Login"
import RegistrationPage from "@/pages/Register"
import AdminDashboard from "@/pages/AdminDashboard"
import EmployeeDashboard from "@/pages/EmployeeDashboard"
import UsersPage from "@/pages/Users"
import AdminApprovalRules from "@/pages/AdminApprovalRules"
import { Toaster } from "@/components/ui/sonner"

function RoleBasedDashboardRoute() {
  const { user, loading } = useUser()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  if (user.role === "ADMIN") {
    return <Navigate to="/admin-dashboard" replace />
  }

  if (user.role === "EMPLOYEE") {
    return <Navigate to="/employee-dashboard" replace />
  }

  return <Navigate to="/admin-dashboard" replace />
}

function AdminUsersRoute() {
  const { user, loading } = useUser()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== "ADMIN") return <Navigate to="/dashboard" replace />

  return <UsersPage />
}

function AdminApprovalRulesRoute() {
  const { user, loading } = useUser()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== "ADMIN") return <Navigate to="/dashboard" replace />

  return <AdminApprovalRules />
}

function EmployeeDashboardRoute() {
  const { user, loading } = useUser()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== "EMPLOYEE") return <Navigate to="/dashboard" replace />

  return <EmployeeDashboard />
}

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />

          <Route path="/dashboard" element={<RoleBasedDashboardRoute />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/employee-dashboard" element={<EmployeeDashboardRoute />} />
          <Route path="/users" element={<AdminUsersRoute />} />
          <Route path="/approval-rules" element={<AdminApprovalRulesRoute />} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </UserProvider>
  )
}

export default App
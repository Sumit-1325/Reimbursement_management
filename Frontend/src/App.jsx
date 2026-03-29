import React from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { UserProvider } from "@/context/UserContext"
import LoginPage from "@/pages/Login"
import RegistrationPage from "@/pages/Register"
import UserDashboard from "@/pages/UserDashboard"

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />

          <Route path="/admin-dashboard" element={<Navigate to="/user-dashboard" replace />} />
          <Route path="/user-dashboard" element={<UserDashboard />} />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  )
}

export default App
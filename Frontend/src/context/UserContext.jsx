import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { authApi } from "@/api/authApi"

const UserContext = createContext()

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Function to fetch and update user data
  const refreshUser = useCallback(async () => {
    try {
      setLoading(true)
      const response = await authApi.getUser()
      setUser(response.data.employee)
      setError(null)
      return response.data.employee
    } catch (err) {
      console.error("Failed to fetch user in context:", err)
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
      }
      setError(err)
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Function to logout user
  const logout = useCallback(() => {
    setUser(null)
    setError(null)
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    const token = localStorage.getItem("accessToken")

    // Skip /me call on public pages when user is not logged in.
    if (!token) {
      setLoading(false)
      return
    }

    refreshUser()
  }, [refreshUser])

  // Listen for storage changes (logout from another tab)
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("accessToken")
      if (!token && user) {
        // Token removed, logout happened
        setUser(null)
      } else if (token && !user && !loading) {
        // Token added back, refetch user
        refreshUser()
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [user, loading, refreshUser])

  return (
    <UserContext.Provider value={{ user, loading, error, setUser, refreshUser, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within UserProvider")
  }
  return context
}

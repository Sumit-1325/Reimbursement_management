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
  }, [])

  // Initial fetch on mount - try to get user via cookies
  useEffect(() => {
    // Only run once on mount to check for existing session
    refreshUser()
  }, []) // Empty array - runs only once on mount

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

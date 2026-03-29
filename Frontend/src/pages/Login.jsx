import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { authApi } from "@/api/authApi"
import { useUser } from "@/context/UserContext"

export default function LoginPage() {
  const navigate = useNavigate()
  const { refreshUser, setUser } = useUser()

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [apiError, setApiError] = useState("")

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Handle input change
  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))
    // Clear error for this field when user starts typing
    if (errors[id]) {
      setErrors(prev => ({
        ...prev,
        [id]: ""
      }))
    }
  }

  // Validate form
  const validateForm = () => {
    const newErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle login
  const handleLogin = async (e) => {
    if (e?.preventDefault) {
      e.preventDefault()
    }
    setApiError("")
    setSuccessMessage("")

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await authApi.login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      })

      // Get user role from response for direct dashboard routing
      const userRole = response.data?.employee?.role

      // Set user immediately for faster post-login render.
      if (response.data?.employee) {
        setUser(response.data.employee)
      }

      setSuccessMessage("Login successful! Redirecting to dashboard...")

      // Clear form
      setFormData({
        email: "",
        password: "",
      })

      // Redirect immediately to appropriate dashboard based on user role
      if (userRole === "ADMIN") {
        navigate("/admin-dashboard", { replace: true })
      } else if (userRole === "MANAGER") {
        navigate("/manager-dashboard", { replace: true })
      } else if (userRole === "EMPLOYEE") {
        navigate("/employee-dashboard", { replace: true })
      } else {
        navigate("/dashboard", { replace: true })
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Login failed. Please try again."
      setApiError(errorMessage)
      console.error("Login error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -z-10 opacity-30"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl -z-10 opacity-30"></div>

      <Card variant="professional" className="w-full max-w-md border-l-4 border-l-blue-600 relative z-10">
        <form onSubmit={handleLogin}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl">Log In</CardTitle>
          <CardDescription className="text-center text-sm">
            Sign in to your management system account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 py-2">
          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-400 text-sm p-3 rounded-md">
              {successMessage}
            </div>
          )}

          {/* API Error Message */}
          {apiError && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-sm p-3 rounded-md">
              {apiError}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              variant="outline"
              className="text-black"
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading}
            />
            {errors.email && (
              <p className="text-sm text-red-400 mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              variant="outline"
              className="text-black"
              value={formData.password}
              onChange={handleInputChange}
              disabled={loading}
            />
            {errors.password && (
              <p className="text-sm text-red-400 mt-1">{errors.password}</p>
            )}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-500 hover:text-blue-800 hover:underline transition-all"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            variant="success"
            size="lg"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </Button>
          <Link to="/register" className="text-center text-sm text-primary mb-4 block hover:underline transition-all">
            Don't have an account? Sign up
          </Link>
        </CardFooter>        </form>      </Card>
    </div>
  )
}
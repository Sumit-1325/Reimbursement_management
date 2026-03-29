import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { authApi } from "@/api/authApi"
import { useUser } from "@/context/UserContext"

export default function RegistrationPage() {
  const navigate = useNavigate()
  const { refreshUser, setUser } = useUser()
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    country: "",
    email: "",
    password: "",
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [apiError, setApiError] = useState("")
  const [countryOptions, setCountryOptions] = useState([])

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch("https://restcountries.com/v3.1/all?fields=name,currencies")
        const countries = await response.json()
        const names = countries
          .map((country) => country?.name?.common)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
        setCountryOptions(names)
      } catch (error) {
        console.error("Failed to fetch countries:", error)
      }
    }

    fetchCountries()
  }, [])

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password) => {
    // Min 8 chars, 1 uppercase, 1 special character
    const hasMinLength = password.length >= 8
    const hasUppercase = /[A-Z]/.test(password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    
    return {
      isValid: hasMinLength && hasUppercase && hasSpecialChar,
      errors: {
        minLength: !hasMinLength,
        uppercase: !hasUppercase,
        specialChar: !hasSpecialChar,
      }
    }
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

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required"
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = "Company name is required"
    }

    if (!formData.country.trim()) {
      newErrors.country = "Country is required"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else {
      const passwordValidation = validatePassword(formData.password)
      if (!passwordValidation.isValid) {
        let passwordErrors = []
        if (passwordValidation.errors.minLength) passwordErrors.push("at least 8 characters")
        if (passwordValidation.errors.uppercase) passwordErrors.push("one uppercase letter")
        if (passwordValidation.errors.specialChar) passwordErrors.push("one special character")
        newErrors.password = `Password must contain ${passwordErrors.join(", ")}`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleRegister = async (e) => {
    e.preventDefault()
    setApiError("")
    setSuccessMessage("")

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await authApi.register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        companyName: formData.companyName.trim(),
        country: formData.country.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      })

      // Registration creates company owner as ADMIN only
      const userRole = response.data?.employee?.role

      // Set user immediately for faster post-register render.
      if (response.data?.employee) {
        setUser(response.data.employee)
      }

      setSuccessMessage("Registration successful! Redirecting to dashboard...")
      
      // Refresh in background to keep context fully synced, without blocking redirect.
      refreshUser().catch((err) => {
        console.error("Background user refresh failed:", err)
      })

      // Clear form
      setFormData({
        firstName: "",
        lastName: "",
        companyName: "",
        country: "",
        email: "",
        password: "",
      })

      // Allow only ADMIN flow after registration
      if (userRole !== "ADMIN") {
        setApiError("Only ADMIN is allowed in registration flow")
        return
      }

      navigate("/admin-dashboard", { replace: true })
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Registration failed. Please try again."
      setApiError(errorMessage)
      console.error("Registration error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -z-10 opacity-30"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl -z-10 opacity-30"></div>
      
      <Card variant="professional" className="w-full max-w-md border-l-4 border-l-purple-600 relative z-10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl">Create Account</CardTitle>
          <CardDescription className="text-center text-sm">
            Join our management system today
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-5 py-2">
          {/* Success Message */}
          {successMessage && (
            <div className="p-3 bg-green-500/20 border border-green-500 rounded text-green-400 text-sm text-center">
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {apiError && (
            <div className="p-3 bg-red-500/20 border border-red-500 rounded text-red-400 text-sm text-center">
              {apiError}
            </div>
          )}

          {/* First Name Field */}
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-semibold">First Name</Label>
            <Input 
              id="firstName" 
              placeholder="Enter your first name" 
              variant="outline"
              className="text-black"
              value={formData.firstName}
              onChange={handleInputChange}
              disabled={loading}
            />
            {errors.firstName && <p className="text-xs text-red-400">{errors.firstName}</p>}
          </div>

          {/* Last Name Field */}
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm font-semibold">Last Name</Label>
            <Input 
              id="lastName" 
              placeholder="Enter your last name" 
              variant="outline"
              className="text-black"
              value={formData.lastName}
              onChange={handleInputChange}
              disabled={loading}
            />
            {errors.lastName && <p className="text-xs text-red-400">{errors.lastName}</p>}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-sm font-semibold">Company Name</Label>
            <Input
              id="companyName"
              placeholder="Enter your company name"
              variant="outline"
              className="text-black"
              value={formData.companyName}
              onChange={handleInputChange}
              disabled={loading}
            />
            {errors.companyName && <p className="text-xs text-red-400">{errors.companyName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country" className="text-sm font-semibold">Country</Label>
            <Input
              id="country"
              placeholder="Enter your country"
              variant="outline"
              className="text-black"
              value={formData.country}
              onChange={handleInputChange}
              disabled={loading}
              list="country-options"
            />
            {errors.country && <p className="text-xs text-red-400">{errors.country}</p>}
            <datalist id="country-options">
              {countryOptions.map((countryName) => (
                <option key={countryName} value={countryName} />
              ))}
            </datalist>
          </div>

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
            {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
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
            {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
            <p className="text-sm text-black mt-1">
              Min 8 characters, 1 uppercase letter, 1 special character
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button 
            className="w-full" 
            variant="success" 
            size="lg"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? "Registering..." : "Register Now"}
          </Button>
          <a 
            href="/login" 
            className="text-center text-sm text-primary mb-4 block hover:underline transition-all"
          >
            Already have an account? Log in
          </a>
        </CardFooter>
      </Card>
    </div>  
  )
}
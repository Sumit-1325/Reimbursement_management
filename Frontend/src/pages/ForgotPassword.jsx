import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { authApi } from "@/api/authApi"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")

    if (!email.trim()) {
      setError("Email is required")
      return
    }

    if (!validateEmail(email.trim())) {
      setError("Please enter a valid email address")
      return
    }

    setLoading(true)
    try {
      const response = await authApi.forgotPassword(email.trim().toLowerCase())
      setMessage(response?.message || "If an account exists with that email, a reset link has been sent.")
      setEmail("")
    } catch (apiError) {
      const errorMessage =
        apiError?.response?.data?.message ||
        "Failed to process request. Please try again."
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -z-10 opacity-30"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl -z-10 opacity-30"></div>

      <Card variant="professional" className="w-full max-w-md border-l-4 border-l-blue-600 relative z-10">
        <form onSubmit={handleSubmit}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-center text-2xl">Forgot Password</CardTitle>
            <CardDescription className="text-center text-sm">
              Enter your email to receive a password reset link.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 py-2">
            {message && (
              <div className="bg-green-500/20 border border-green-500/50 text-green-400 text-sm p-3 rounded-md">
                {message}
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                variant="outline"
                className="text-black"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
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
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
            <Link to="/login" className="text-center text-sm text-primary mb-2 block hover:underline transition-all">
              Back to login
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

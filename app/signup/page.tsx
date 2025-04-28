"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { createClientSide } from "@/lib/supabase/client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

function isValidEmail(email: string) {
  // Improved email regex (matches most valid emails)
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
}

function isValidPhone(phone: string) {
  return /^\+[1-9]\d{7,14}$/.test(phone)
}

export default function SignUpPage() {
  const router = useRouter()
  const [tab, setTab] = useState("email")
  const [fullName, setFullName] = useState("")
  const [dob, setDob] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    if (tab === "email") {
      if (!isValidEmail(trimmedEmail)) {
        setError("Please enter a valid email address.")
        return
      }
      if (!isValidPhone(trimmedPhone)) {
        setError("Please enter a valid phone number with country code, e.g. +254759830117.")
        return
      }
    } else {
      if (!isValidPhone(trimmedPhone)) {
        setError("Please enter a valid phone number with country code, e.g. +254759830117.")
        return
      }
      if (!isValidEmail(trimmedEmail)) {
        setError("Please enter a valid email address.")
        return
      }
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    const supabase = createClientSide()
    let result
    if (tab === "email") {
      result = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            role: "viewer",
            fullName,
            dob,
            phone: trimmedPhone,
          },
        },
      })
    } else {
      result = await supabase.auth.signUp({
        phone: trimmedPhone,
        password,
        options: {
          data: {
            role: "viewer",
            fullName,
            dob,
            email: trimmedEmail,
          },
        },
      })
    }
    setLoading(false)
    if (result.error) {
      setError(result.error.message)
    } else {
      setSuccess(true)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert variant="success">
                <AlertTitle>Account Created!</AlertTitle>
                <AlertDescription>
                  An activation link has been sent to your email or phone. Please check your inbox and follow the link to activate your account.
                </AlertDescription>
              </Alert>
              <Button className="w-full" onClick={() => router.push("/auth/signin")}>Go to Login</Button>
            </div>
          ) : (
            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="email" className="w-1/2">Sign up with Email</TabsTrigger>
                <TabsTrigger value="phone" className="w-1/2">Sign up with Phone</TabsTrigger>
              </TabsList>
              <TabsContent value="email">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Input
                    type="text"
                    placeholder="Full Names"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                  <Input
                    type="date"
                    placeholder="YYYY-MM-DD (Date of Birth)"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    required
                    pattern="\d{4}-\d{2}-\d{2}"
                    title="Please enter your date of birth in YYYY-MM-DD format."
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  <Input
                    type="tel"
                    placeholder="+254759830117"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                    autoComplete="tel"
                    pattern="^\+[1-9]\d{7,14}$"
                    title="Please enter your phone number with country code, e.g. +254759830117"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <Input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing Up..." : "Sign Up"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="phone">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Input
                    type="text"
                    placeholder="Full Names"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                  <Input
                    type="date"
                    placeholder="YYYY-MM-DD (Date of Birth)"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    required
                    pattern="\d{4}-\d{2}-\d{2}"
                    title="Please enter your date of birth in YYYY-MM-DD format."
                  />
                  <Input
                    type="tel"
                    placeholder="+254759830117"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                    autoComplete="tel"
                    pattern="^\+[1-9]\d{7,14}$"
                    title="Please enter your phone number with country code, e.g. +254759830117"
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <Input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing Up..." : "Sign Up"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 
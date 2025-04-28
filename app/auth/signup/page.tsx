"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SignUp() {
  const router = useRouter()
  const { signUp } = useSupabaseAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [activeTab, setActiveTab] = useState("email")

  // Email signup state
  const [fullName, setFullName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Phone signup state
  const [phoneFullName, setPhoneFullName] = useState("")
  const [phoneDateOfBirth, setPhoneDateOfBirth] = useState("")
  const [phone, setPhone] = useState("")
  const [phonePassword, setPhonePassword] = useState("")
  const [confirmPhonePassword, setConfirmPhonePassword] = useState("")

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const validatePhone = (phone) => {
    const re = /^\+[1-9]\d{1,14}$/
    return re.test(phone)
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("")

    if (!fullName) {
      setErrorMessage("Full name is required")
      setIsLoading(false)
      return
    }

    if (!dateOfBirth) {
      setErrorMessage("Date of birth is required")
      setIsLoading(false)
      return
    }

    if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address")
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      await signUp(email, password, {
        fullName,
        dateOfBirth,
      })
      router.push("/auth/verify-email")
    } catch (error) {
      console.error("Sign up error:", error)
      setErrorMessage(error.message || "Failed to sign up")
      setIsLoading(false)
    }
  }

  const handlePhoneSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("")

    if (!phoneFullName) {
      setErrorMessage("Full name is required")
      setIsLoading(false)
      return
    }

    if (!phoneDateOfBirth) {
      setErrorMessage("Date of birth is required")
      setIsLoading(false)
      return
    }

    if (!validatePhone(phone)) {
      setErrorMessage("Please enter a valid phone number (e.g., +254712345678)")
      setIsLoading(false)
      return
    }

    if (phonePassword !== confirmPhonePassword) {
      setErrorMessage("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      // TODO: Implement phone signup with Supabase
      // await signUpWithPhone(phone, phonePassword, {
      //   fullName: phoneFullName,
      //   dateOfBirth: phoneDateOfBirth,
      // })
      setErrorMessage("Phone signup is not implemented yet")
      setIsLoading(false)
    } catch (error) {
      console.error("Phone sign up error:", error)
      setErrorMessage(error.message || "Failed to sign up with phone")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>Choose your preferred sign up method</CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>
            
            <TabsContent value="email">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Sign up with Email"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="phone">
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneFullName">Full Name</Label>
                  <Input
                    id="phoneFullName"
                    type="text"
                    value={phoneFullName}
                    onChange={(e) => setPhoneFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneDateOfBirth">Date of Birth</Label>
                  <Input
                    id="phoneDateOfBirth"
                    type="date"
                    value={phoneDateOfBirth}
                    onChange={(e) => setPhoneDateOfBirth(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254712345678"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phonePassword">Password</Label>
                  <Input
                    id="phonePassword"
                    type="password"
                    value={phonePassword}
                    onChange={(e) => setPhonePassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPhonePassword">Confirm Password</Label>
                  <Input
                    id="confirmPhonePassword"
                    type="password"
                    value={confirmPhonePassword}
                    onChange={(e) => setConfirmPhonePassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Sign up with Phone"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
} 
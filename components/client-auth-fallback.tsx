"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"

export function ClientAuthFallback() {
  const { session, loading } = useSupabaseAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Only redirect if we're not already on the sign-in page
    if (!loading && !session && !pathname.startsWith("/auth/")) {
      setIsRedirecting(true)
      router.replace("/auth/signin")
    } else if (session) {
      setIsRedirecting(false)
    }
  }, [session, loading, router, pathname])

  if (loading || isRedirecting) {
    return (
      <div className="container mx-auto py-6 text-center">
        <h1 className="text-3xl font-bold mb-6">Checking Authentication...</h1>
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  // Don't show the auth required message if we're on an auth page
  if (pathname.startsWith("/auth/")) {
    return null
  }

  return (
    <div className="container mx-auto py-6 text-center">
      <h1 className="text-3xl font-bold mb-6">Authentication Required</h1>
      <p className="mb-4">You need to be signed in to view this page.</p>
      <Button onClick={() => router.replace("/auth/signin")}>Sign In</Button>
    </div>
  )
}

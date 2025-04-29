"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { LoadingScreen } from "@/components/ui/loading-screen"

export function ClientAuthFallback() {
  const { session, loading } = useSupabaseAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (!loading && !session && !pathname.startsWith("/auth/")) {
      router.replace("/auth/signin")
    }
  }, [session, loading, router, pathname])

  // Don't show anything if we're on an auth page
  if (pathname.startsWith("/auth/")) {
    return null
  }

  // Show loading screen while checking auth or redirecting
  if (loading || !session) {
    return <LoadingScreen />
  }

  return (
    <div className="container mx-auto py-6 text-center">
      <h1 className="text-3xl font-bold mb-6">Authentication Required</h1>
      <p className="mb-4">You need to be signed in to view this page.</p>
      <Button onClick={() => router.replace("/auth/signin")}>Sign In</Button>
    </div>
  )
}

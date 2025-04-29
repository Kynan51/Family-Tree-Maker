"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { LoadingScreen } from "@/components/ui/loading-screen"

export function AuthCheck({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSupabaseAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/auth/signin")
    }
  }, [session, loading, router])

  if (loading) {
    return <LoadingScreen />
  }

  if (!session) {
    return null
  }

  return <>{children}</>
}

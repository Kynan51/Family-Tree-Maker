"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"

export function AuthCheck({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSupabaseAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/auth/signin")
    }
  }, [session, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return <>{children}</>
}

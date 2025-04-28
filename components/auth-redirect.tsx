"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"

export function AuthRedirect() {
  const { session, loading } = useSupabaseAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/auth/signin")
    }
  }, [session, loading, router])

  return null
}

"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Session, User } from "@supabase/supabase-js"

interface SupabaseAuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType>({
  session: null,
  user: null,
  loading: true,
  signIn: async () => {
    throw new Error("Auth provider not initialized")
  },
  signOut: async () => {
    throw new Error("Auth provider not initialized")
  },
  signUp: async () => {
    throw new Error("Auth provider not initialized")
  },
})

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Debug log on every render
  // console.log("[SupabaseAuthProvider] Rendered. Session:", session);

  const signIn = async (email: string, password: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    // Remove manual localStorage and cookie clearing
    setSession(null)
    setUser(null)
  }

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <SupabaseAuthContext.Provider value={{ session, user, loading, signIn, signOut, signUp }}>
      {children}
    </SupabaseAuthContext.Provider>
  )
}

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext)
  if (context === undefined) {
    throw new Error("useSupabaseAuth must be used within a SupabaseAuthProvider")
  }
  return context
} 
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
})

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Debug log on every render
  console.log("[SupabaseAuthProvider] Rendered. Session:", session);

  const signIn = async (email: string, password: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signOut = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    // Clear local storage
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('sb-pqcdstmuqohhaqoungvu-auth-token')
    }
    
    // Clear session state
    setSession(null)
    setUser(null)
  }

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session:", session)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed, new session:", session)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // --- NEW: Set the session cookie for SSR sync ---
      if (typeof document !== "undefined") {
        if (session?.access_token) {
          // Set the cookie with the correct name, path, and SameSite policy
          document.cookie = `sb-pqcdstmuqohhaqoungvu-auth-token=${session.access_token}; path=/; SameSite=Lax`;
        } else {
          // Remove the cookie if logged out
          document.cookie = `sb-pqcdstmuqohhaqoungvu-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
        }
      }
      // --- END NEW ---
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <SupabaseAuthContext.Provider value={{ session, user, loading, signIn, signOut }}>
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
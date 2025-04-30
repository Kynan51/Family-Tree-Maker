import { createClient } from "@/lib/supabase/server"
import type { User } from "@supabase/supabase-js"

export interface ExtendedUser extends User {
  role?: string;
  photoUrl?: string;
}

export async function getSession() {
  const supabase = createClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error("Error getting session:", error)
    return null
  }

  return session
}

export async function getUser() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error("Error getting user:", error)
    return null
  }

  return user as ExtendedUser
}

export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error("Error signing out:", error)
    throw error
  }
}

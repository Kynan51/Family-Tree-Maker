import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getEnvVar } from "../env-check"

export function createClient() {
  try {
    const supabaseUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL")
    const supabaseKey = getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY") // Changed to use anon key for API operations

    return createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  } catch (error) {
    console.error("Failed to create Supabase client:", error)
    throw new Error("Database connection failed. Please check your environment variables.")
  }
}

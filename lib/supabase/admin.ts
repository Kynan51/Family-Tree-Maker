import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getEnvVar } from "../env-check"

export function createAdminClient() {
  try {
    const supabaseUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL")
    const supabaseKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY")

    return createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  } catch (error) {
    console.error("Failed to create Supabase admin client:", error)
    throw new Error("Database connection failed. Please check your environment variables.")
  }
}
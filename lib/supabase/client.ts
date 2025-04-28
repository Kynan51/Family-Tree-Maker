import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Create a singleton to avoid multiple instances
let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null

export function createClientSide() {
  if (supabaseClient) return supabaseClient

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables")
    }

    supabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
    return supabaseClient
  } catch (error) {
    console.error("Failed to create Supabase client:", error)
    throw new Error("Database connection failed. Please check your environment variables.")
  }
}

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getEnvVar } from "../env-check"

export function createAdminClient() {
  try {
    const supabaseUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL")
    const supabaseKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY")

    return createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'sb-pqcdstmuqohhaqoungvu-auth-token',
        storage: {
          getItem: (key) => {
            if (typeof window === 'undefined') return null;
            return window.localStorage.getItem(key);
          },
          setItem: (key, value) => {
            if (typeof window === 'undefined') return;
            window.localStorage.setItem(key, value);
          },
          removeItem: (key) => {
            if (typeof window === 'undefined') return;
            window.localStorage.removeItem(key);
          },
        },
      },
    })
  } catch (error) {
    console.error("Failed to create Supabase admin client:", error)
    throw new Error("Database connection failed. Please check your environment variables.")
  }
}
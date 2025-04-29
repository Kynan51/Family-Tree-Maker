import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

let supabase: ReturnType<typeof createPagesBrowserClient> | null = null

export function createClient() {
  if (!supabase) {
    supabase = createPagesBrowserClient()
  }
  return supabase
}

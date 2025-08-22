import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()
    await supabase.from("family_members").select("id").limit(1)
    return new Response(null, { status: 204 })
  } catch {
    return new Response(null, { status: 500 })
  }
}
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()
    // Simple, non-destructive query to keep Supabase awake
    const { error } = await supabase.from("family_members").select("id").limit(1)
    if (error) {
      console.error("Supabase keep-alive error:", error)
      return new NextResponse(null, { status: 500 })
    }
    // Minimal response: 204 No Content
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("Keep-alive endpoint error:", error)
    return new NextResponse(null, { status: 500 })
  }
}

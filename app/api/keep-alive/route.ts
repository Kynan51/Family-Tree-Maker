import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()
    // Simple, non-destructive query to keep Supabase awake
    const { data, error } = await supabase.from("family_members").select("id").limit(1)
    if (error) {
      console.error("Supabase keep-alive error:", error)
      return NextResponse.json({ status: "error", message: error.message }, { status: 500 })
    }
    return NextResponse.json({ status: "success", message: "Ping successful!" })
  } catch (error) {
    console.error("Keep-alive endpoint error:", error)
    return NextResponse.json({ status: "error", message: "Ping failed." }, { status: 500 })
  }
}

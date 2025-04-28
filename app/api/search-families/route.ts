import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-session"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const session = await getServerSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query) {
    return NextResponse.json({ error: "Missing search query" }, { status: 400 })
  }

  const supabase = createClient() // Using regular client since search respects privacy settings

  // Check privacy settings first
  const { data: settings } = await supabase.from("app_settings").select("*").single()
  const privacyEnabled = settings?.privacy_enabled ?? true

  let searchQuery = supabase
    .from("families")
    .select("*")
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)

  // If privacy is enabled, only return public families or ones the user has access to
  if (privacyEnabled) {
    const { data: accessibleFamilyIds } = await supabase
      .from("user_family_access")
      .select("family_id")
      .eq("user_id", session.user.id)
      .eq("status", "approved")

    const familyIds = accessibleFamilyIds?.map(row => row.family_id) || []
    
    searchQuery = searchQuery.or(`is_public.eq.true,id.in.(${familyIds.join(",")})`)
  }

  const { data, error } = await searchQuery

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

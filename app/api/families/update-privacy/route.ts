import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-session"

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { familyId, isPublic } = await request.json()

    if (!familyId || typeof isPublic !== "boolean") {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const supabase = createClient()

    // Check if user has admin access to the family
    const { data: adminAccess } = await supabase
      .from("user_family_access")
      .select("access_level")
      .eq("user_id", session.user.id)
      .eq("family_id", familyId)
      .eq("status", "approved")
      .eq("access_level", "admin")
      .single()

    const isAdmin = !!adminAccess || session.user.role === "super_admin"

    if (!isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Update family privacy setting
    const { error: updateError } = await supabase
      .from("families")
      .update({ is_public: isPublic })
      .eq("id", familyId)

    if (updateError) {
      console.error("Error updating family privacy:", updateError)
      return new NextResponse("Failed to update privacy settings", { status: 500 })
    }

    return new NextResponse("Privacy settings updated successfully", { status: 200 })
  } catch (error) {
    console.error("Error in update-privacy:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 
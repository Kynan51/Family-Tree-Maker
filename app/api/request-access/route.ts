import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-session"

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const formData = await request.formData()
    const familyId = formData.get("familyId") as string

    if (!familyId) {
      return new NextResponse("Family ID is required", { status: 400 })
    }

    const supabase = createClient()

    // Check if family exists and is private
    const { data: family, error: familyError } = await supabase
      .from("families")
      .select("is_public")
      .eq("id", familyId)
      .single()

    if (familyError || !family) {
      return new NextResponse("Family not found", { status: 404 })
    }

    if (family.is_public) {
      return new NextResponse("This family tree is public", { status: 400 })
    }

    // Check if user already has a pending or approved request
    const { data: existingAccess } = await supabase
      .from("user_family_access")
      .select("status")
      .eq("user_id", session.user.id)
      .eq("family_id", familyId)
      .single()

    if (existingAccess) {
      if (existingAccess.status === "approved") {
        return new NextResponse("You already have access to this family tree", { status: 400 })
      }
      if (existingAccess.status === "pending") {
        return new NextResponse("You already have a pending request", { status: 400 })
      }
    }

    // Create access request
    const { error: accessError } = await supabase
      .from("user_family_access")
      .insert({
        user_id: session.user.id,
        family_id: familyId,
        status: "pending",
        access_level: "viewer",
      })

    if (accessError) {
      console.error("Error creating access request:", accessError)
      return new NextResponse("Failed to create access request", { status: 500 })
    }

    return new NextResponse("Access request submitted successfully", { status: 200 })
  } catch (error) {
    console.error("Error in request-access:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 
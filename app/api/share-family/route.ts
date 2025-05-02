import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-session"

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { familyId, email } = await request.json()

    if (!familyId || !email) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const supabase = createClient()

    // Check if the user has admin access to the family
    const { data: access, error: accessError } = await supabase
      .from("user_family_access")
      .select("access_level")
      .eq("user_id", session.user.id)
      .eq("family_id", familyId)
      .eq("status", "approved")
      .eq("access_level", "admin")
      .single()

    if (accessError || !access) {
      return new NextResponse("Unauthorized - Not an admin of this family", { status: 403 })
    }

    // Check if the email already has access
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (existingUser) {
      const { data: existingAccess } = await supabase
        .from("user_family_access")
        .select("status")
        .eq("user_id", existingUser.id)
        .eq("family_id", familyId)
        .single()

      if (existingAccess) {
        return new NextResponse("User already has access to this family", { status: 400 })
      }
    }

    // Create a pending access request
    const { error: shareError } = await supabase
      .from("user_family_access")
      .insert({
        family_id: familyId,
        invited_by: session.user.id,
        invited_email: email,
        status: "pending",
        access_level: "member",
      })

    if (shareError) {
      console.error("Error sharing family:", shareError)
      return new NextResponse("Failed to share family", { status: 500 })
    }

    // TODO: Send email notification to the invited user
    // This would typically be handled by an email service

    return new NextResponse("Family shared successfully", { status: 200 })
  } catch (error) {
    console.error("Error in share-family route:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 
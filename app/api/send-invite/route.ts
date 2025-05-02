import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-session"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { email, familyId, familyName } = await request.json()

    if (!email || !familyId || !familyName) {
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

    // Check if family exists
    const { data: family, error: familyError } = await supabase
      .from("families")
      .select("is_public")
      .eq("id", familyId)
      .single()

    if (familyError || !family) {
      return new NextResponse("Family not found", { status: 404 })
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tree/${familyId}`

    // Send email invitation
    const { error: emailError } = await resend.emails.send({
      from: "Family Tree Maker <noreply@familytreemaker.com>",
      to: email,
      subject: `Invitation to view ${familyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been invited to view a family tree</h2>
          <p>${session.user.email} has invited you to view their family tree "${familyName}".</p>
          <p>Click the button below to view the family tree:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${shareUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View Family Tree
            </a>
          </div>
          ${!family.is_public ? `
            <p style="color: #666; font-size: 14px;">
              Note: This is a private family tree. You will need to request access to view it.
            </p>
          ` : ''}
          <p style="color: #666; font-size: 14px;">
            If you're having trouble clicking the button, copy and paste this URL into your browser:<br>
            ${shareUrl}
          </p>
        </div>
      `,
    })

    if (emailError) {
      console.error("Error sending email:", emailError)
      return new NextResponse("Failed to send invitation email", { status: 500 })
    }

    return new NextResponse("Invitation sent successfully", { status: 200 })
  } catch (error) {
    console.error("Error in send-invite:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 
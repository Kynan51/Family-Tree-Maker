import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-session"
import { createAdminClient } from "@/lib/supabase/admin"
import { logExport } from "@/lib/actions"
import { handleApiError } from "@/lib/api-error-handler"
import ExcelJS from "exceljs"

export async function GET(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const familyId = searchParams.get("familyId")
    const format = searchParams.get("format") || "excel"

    const supabase = createAdminClient() // Admin operation for data export

    // Get family data
    let familyQuery = supabase.from("family_members").select("*, relationships(*)")

    if (familyId) {
      familyQuery = familyQuery.eq("family_id", familyId)
    }

    const { data: familyMembers, error } = await familyQuery

    if (error) {
      throw new Error(`Failed to fetch family data: ${error.message}`)
    }

    // Log the export
    await logExport(session.user.id, format, familyId || undefined)

    // Generate Excel file
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Family Members")

    // Add headers
    worksheet.columns = [
      { header: "Full Name", key: "full_name", width: 30 },
      { header: "Year of Birth", key: "year_of_birth", width: 15 },
      { header: "Living Place", key: "living_place", width: 30 },
      { header: "Is Deceased", key: "is_deceased", width: 15 },
      { header: "Marital Status", key: "marital_status", width: 15 },
      { header: "Created At", key: "created_at", width: 20 },
      { header: "Updated At", key: "updated_at", width: 20 },
    ]

    // Add rows
    worksheet.addRows(familyMembers)

    // Set content type and filename
    const buffer = await workbook.xlsx.writeBuffer()
    const headers = {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="family-members-${new Date().toISOString().split("T")[0]}.xlsx"`,
    }

    return new Response(buffer, { headers })
  } catch (error) {
    return handleApiError(error)
  }
}

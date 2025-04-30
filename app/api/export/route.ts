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

    // Get family data with relationships
    let familyQuery = supabase
      .from("family_members")
      .select(`
        *,
        relationships:relationships!member_id(
          type,
          related_member:family_members!related_member_id(
            full_name
          )
        )
      `)

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

    // Add headers with more comprehensive information
    worksheet.columns = [
      { header: "Full Name", key: "full_name", width: 30 },
      { header: "Year of Birth", key: "year_of_birth", width: 15 },
      { header: "Living Place", key: "living_place", width: 30 },
      { header: "Is Deceased", key: "is_deceased", width: 15 },
      { header: "Marital Status", key: "marital_status", width: 15 },
      { header: "Occupation", key: "occupation", width: 30 },
      { header: "Parents", key: "parents", width: 40 },
      { header: "Spouse(s)", key: "spouses", width: 40 },
      { header: "Children", key: "children", width: 40 },
      { header: "Created At", key: "created_at", width: 20 },
      { header: "Updated At", key: "updated_at", width: 20 }
    ]

    // Process and add rows with relationship information
    const processedMembers = familyMembers.map(member => {
      // Group relationships by type
      const relationships = member.relationships || []
      const parents = relationships
        .filter(r => r.type === 'child')
        .map(r => r.related_member?.full_name)
        .filter(Boolean)
        .join(", ")
      
      const spouses = relationships
        .filter(r => r.type === 'spouse')
        .map(r => r.related_member?.full_name)
        .filter(Boolean)
        .join(", ")
      
      const children = relationships
        .filter(r => r.type === 'parent')
        .map(r => r.related_member?.full_name)
        .filter(Boolean)
        .join(", ")

      return {
        ...member,
        parents,
        spouses,
        children,
        is_deceased: member.is_deceased ? "Yes" : "No"
      }
    })

    // Add rows
    worksheet.addRows(processedMembers)

    // Style the headers
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

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

import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createAdminClient } from "@/lib/supabase/admin"
import { logExport } from "@/lib/actions"
import { handleApiError } from "@/lib/api-error-handler"
import ExcelJS from "exceljs"
import { cookies } from "next/headers"
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export async function GET(request: Request) {
  console.log('Export API called')
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error("Session error:", sessionError)
      return NextResponse.json({ error: "Authentication error", details: sessionError.message }, { status: 401 })
    }
    
    if (!session) {
      console.error("No session found")
      return NextResponse.json({ error: "Unauthorized - No session found" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const familyId = searchParams.get("familyId")
    const format = searchParams.get("format") || "excel"

    console.log('Export request params:', { familyId, format })

    if (!familyId) {
      console.error("Export request missing familyId")
      return NextResponse.json({ 
        error: "Bad Request", 
        details: "Family ID is required" 
      }, { status: 400 })
    }

    if (format !== "excel") {
      console.error("Export request with invalid format:", format)
      return NextResponse.json({ 
        error: "Bad Request", 
        details: "Invalid export format" 
      }, { status: 400 })
    }

    const adminClient = createAdminClient() // Admin operation for data export

    // Get family data with relationships
    console.log('Fetching family members for ID:', familyId)
    const { data: familyMembers, error: queryError } = await adminClient
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
      .eq("family_id", familyId)

    if (queryError) {
      console.error("Database query error:", queryError)
      return NextResponse.json({ 
        error: "Failed to fetch family data", 
        details: queryError.message 
      }, { status: 500 })
    }

    if (!familyMembers || familyMembers.length === 0) {
      console.error("No family members found for ID:", familyId)
      return NextResponse.json({ 
        error: "No family members found", 
        details: "No data available for the specified family ID" 
      }, { status: 404 })
    }

    console.log(`Found ${familyMembers.length} family members`)

    try {
      // Log the export
      console.log('Logging export for user:', session.user.id)
      await logExport(session.user.id, format, familyId)
    } catch (logError) {
      console.error("Error logging export:", logError)
      // Continue with export even if logging fails
    }

    // Generate Excel file
    console.log('Generating Excel file')
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
      { header: "Children", key: "children", width: 40 }
    ]

    // Process and add rows with relationship information
    console.log('Processing family members data')
    const processedMembers = familyMembers.map(member => {
      // Group relationships by type
      const relationships = member.relationships || []
      const parents = relationships
        .filter(r => r.type === 'parent')
        .map(r => r.related_member?.full_name)
        .filter(Boolean)
        .join(", ")
      
      const spouses = relationships
        .filter(r => r.type === 'spouse')
        .map(r => r.related_member?.full_name)
        .filter(Boolean)
        .join(", ")
      
      const children = relationships
        .filter(r => r.type === 'child')
        .map(r => r.related_member?.full_name)
        .filter(Boolean)
        .join(", ")

      return {
        full_name: member.full_name,
        year_of_birth: member.year_of_birth,
        living_place: member.living_place,
        is_deceased: member.is_deceased ? "Yes" : "No",
        marital_status: member.marital_status,
        occupation: member.occupation,
        parents,
        spouses,
        children
      }
    })

    // Add rows
    console.log('Adding rows to worksheet')
    worksheet.addRows(processedMembers)

    // Style the headers
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // Set content type and filename
    console.log('Generating Excel buffer')
    const buffer = await workbook.xlsx.writeBuffer()
    console.log('Excel buffer size:', buffer.byteLength)

    const headers = {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="family-members-${familyId}.xlsx"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }

    console.log('Sending response with Excel file')
    return new NextResponse(buffer, { headers })
  } catch (error) {
    console.error("Unexpected error in export route:", error)
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error instanceof Error ? error.message : "An unexpected error occurred" 
    }, { status: 500 })
  }
}

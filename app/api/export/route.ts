import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createAdminClient } from "@/lib/supabase/admin"
import { logExport } from "@/lib/actions"
import { handleApiError } from "@/lib/api-error-handler"
import ExcelJS from "exceljs"
import { cookies } from "next/headers"
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { getSession } from '@/lib/auth'
import { getFamilyMembers } from '@/lib/data'
import { FamilyMember } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    const format = searchParams.get('format') || 'excel';

    if (!familyId) {
      return new Response(JSON.stringify({ error: 'Family ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch family members
    const familyMembers = await getFamilyMembers(familyId);
    if (!familyMembers || familyMembers.length === 0) {
      return new Response(JSON.stringify({ error: 'No family members found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Log the export
    await logExport(session.user.id, familyId, format);

    // Generate Excel file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Family Tree');

    // Add headers
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Birth Year', key: 'birthYear', width: 15 },
      { header: 'Death Year', key: 'deathYear', width: 15 },
      { header: 'Parents', key: 'parents', width: 40 },
      { header: 'Spouse', key: 'spouse', width: 30 },
      { header: 'Children', key: 'children', width: 40 },
    ];

    // Process family members data
    familyMembers.forEach((member: FamilyMember) => {
      const parents = member.relationships
        ?.filter(r => r.type === 'parent')
        .map(r => r.relatedMemberId)
        .join(', ') || '';

      const spouse = member.relationships
        ?.find(r => r.type === 'spouse')
        ?.relatedMemberId || '';

      const children = member.relationships
        ?.filter(r => r.type === 'child')
        .map(r => r.relatedMemberId)
        .join(', ') || '';

      worksheet.addRow({
        name: member.fullName || member.name,
        birthYear: member.yearOfBirth || '',
        deathYear: member.isDeceased ? 'Deceased' : '',
        parents,
        spouse,
        children,
      });
    });

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="family-tree-${familyId}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: 'Export failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

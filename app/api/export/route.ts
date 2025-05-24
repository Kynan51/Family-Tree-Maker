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
import { demoFamilyMembers } from '@/lib/demo-family-tree'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    const format = searchParams.get('format') || 'excel';

    // Allow unauthenticated export for demo family
    if (familyId === 'demo-family' && format === 'excel') {
      const familyMembers = demoFamilyMembers;
      const memberMap = Object.fromEntries(familyMembers.map(m => [m.id, m]));
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Family Tree');
      worksheet.columns = [
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Gender', key: 'gender', width: 12 },
        { header: 'Birth Year', key: 'birthYear', width: 15 },
        { header: 'Is Deceased', key: 'isDeceased', width: 15 },
        { header: 'Death Year', key: 'deathYear', width: 15 },
        { header: 'Living Place', key: 'livingPlace', width: 30 },
        { header: 'Occupation', key: 'occupation', width: 20 },
        // { header: 'Education', key: 'education', width: 20 },
        { header: 'Parents', key: 'parents', width: 40 },
        { header: 'Spouse', key: 'spouse', width: 30 },
        { header: 'Children', key: 'children', width: 40 },
      ];
      // Make header row bold
      worksheet.getRow(1).font = { bold: true };
      familyMembers.forEach((member) => {
        // Parents: relationships where this member is a child (type === 'parent')
        const parents = member.relationships
          ?.filter(r => r.type === 'parent')
          .map(r => memberMap[r.relatedMemberId]?.fullName || r.relatedMemberId)
          .join(', ') || '';
        // Children: relationships where this member is a parent (type === 'child')
        const children = member.relationships
          ?.filter(r => r.type === 'child')
          .map(r => memberMap[r.relatedMemberId]?.fullName || r.relatedMemberId)
          .join(', ') || '';
        // Spouse: relationship where type === 'spouse'
        const spouseRel = member.relationships?.find(r => r.type === 'spouse');
        const spouse = spouseRel ? (memberMap[spouseRel.relatedMemberId]?.fullName || spouseRel.relatedMemberId) : '';
        worksheet.addRow({
          name: member.fullName || member.name,
          gender: member.gender || '',
          birthYear: member.yearOfBirth || '',
          isDeceased: member.isDeceased ? 'Yes' : 'No',
          deathYear: member.yearOfDeath || '',
          livingPlace: member.livingPlace || '',
          occupation: member.occupation || '',
          parents,
          spouse,
          children,
        });
      });
      const buffer = await workbook.xlsx.writeBuffer();
      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="family-tree-${familyId}.xlsx"`,
        },
      });
    }

    // familyId and format already declared above
    if (!familyId) {
      return new Response(JSON.stringify({ error: 'Family ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch family members
    const familyMembers = await getFamilyMembers(familyId || undefined);
    const memberMap = Object.fromEntries(familyMembers.map(m => [m.id, m]));
    if (!familyMembers || familyMembers.length === 0) {
      return new Response(JSON.stringify({ error: 'No family members found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Log the export only if authenticated
    const session = await getSession();
    if (session) {
      await logExport(session.user.id, familyId || '', format);
    }

    // Generate Excel file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Family Tree');
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Gender', key: 'gender', width: 12 },
      { header: 'Birth Year', key: 'birthYear', width: 15 },
      { header: 'Is Deceased', key: 'isDeceased', width: 15 },
      { header: 'Death Year', key: 'deathYear', width: 15 },
      { header: 'Living Place', key: 'livingPlace', width: 30 },
      { header: 'Occupation', key: 'occupation', width: 20 },
      { header: 'Parents', key: 'parents', width: 40 },
      { header: 'Spouse', key: 'spouse', width: 30 },
      { header: 'Children', key: 'children', width: 40 },
    ];
    // Make header row bold
    worksheet.getRow(1).font = { bold: true };
    familyMembers.forEach((member) => {
      // Parents: relationships where this member is a child (type === 'parent')
      const parents = member.relationships
        ?.filter(r => r.type === 'parent')
        .map(r => memberMap[r.relatedMemberId]?.fullName || r.relatedMemberId)
        .join(', ') || '';
      // Children: relationships where this member is a parent (type === 'child')
      const children = member.relationships
        ?.filter(r => r.type === 'child')
        .map(r => memberMap[r.relatedMemberId]?.fullName || r.relatedMemberId)
        .join(', ') || '';
      const spouseRel = member.relationships?.find(r => r.type === 'spouse');
      const spouse = spouseRel ? (memberMap[spouseRel.relatedMemberId]?.fullName || spouseRel.relatedMemberId) : '';
      worksheet.addRow({
        name: member.fullName || member.name,
        gender: member.gender || '',
        birthYear: member.yearOfBirth || '',
        isDeceased: member.isDeceased ? 'Yes' : 'No',
        deathYear: member.yearOfDeath || '',
        livingPlace: member.livingPlace || '',
        occupation: member.occupation || '',
        parents,
        spouse,
        children,
      });
    });
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

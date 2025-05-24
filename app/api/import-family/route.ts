import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createFamilyMember } from '@/lib/actions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, isPublic, userId, members } = body;
    if (!name || !userId || !Array.isArray(members) || members.length === 0) {
      console.error('[IMPORT] Missing required fields:', { name, userId, membersLength: members?.length });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const supabase = createAdminClient();
    // Create the family
    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert([
        { name, description, is_public: isPublic },
      ])
      .select()
      .single();
    if (familyError) {
      console.error('[IMPORT] Family creation error:', familyError.message);
      return NextResponse.json({ error: familyError.message }, { status: 500 });
    }
    // Give user admin access
    const { error: accessError } = await supabase
      .from('user_family_access')
      .insert([
        {
          user_id: userId,
          family_id: family.id,
          access_level: 'admin',
          status: 'approved',
        },
      ]);
    if (accessError) {
      console.error('[IMPORT] Access grant error:', accessError.message);
      return NextResponse.json({ error: accessError.message }, { status: 500 });
    }
    // Assign IDs for all members up front
    const normalizeName = (name: string) => (name || '').trim().toLowerCase();
    const nameToId: Record<string, string> = {};
    const duplicateNames: string[] = [];
    const missingNames: string[] = [];
    members.forEach((m: any, idx: number) => {
      const norm = normalizeName(m.full_name);
      if (!norm) {
        missingNames.push(`Row ${idx + 1}`);
      } else if (nameToId[norm]) {
        duplicateNames.push(m.full_name);
      } else {
        nameToId[norm] = crypto.randomUUID();
      }
    });
    if (missingNames.length > 0) {
      console.warn(`[IMPORT] Members with missing names:`, missingNames);
    }
    if (duplicateNames.length > 0) {
      console.warn(`[IMPORT] Duplicate member names detected:`, duplicateNames);
    }
    // Log the full incoming members array for debugging
    console.log('[IMPORT] Incoming members payload:', JSON.stringify(members, null, 2));
    // Deduplicate members array before inserting
    // Improved deduplication: include sorted parent names in the key
    const uniqueMemberKey = (m: any) => {
      const parents = (typeof m.parents === 'string' && m.parents.trim() !== '')
        ? m.parents.split(',').map((n: string) => n.trim().toLowerCase()).sort().join(',')
        : '';
      return `${normalizeName(m.full_name)}|${m.yearOfBirth}|${(m.livingPlace || m.living_place || 'Unknown').trim().toLowerCase()}|${parents}`;
    };
    const seenKeys = new Set<string>();
    const dedupedMembers: any[] = [];
    members.forEach((m) => {
      const key = uniqueMemberKey(m);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        dedupedMembers.push(m);
      }
    });
    // Update nameToId to use deduped members only
    Object.keys(nameToId).forEach(norm => { delete nameToId[norm]; });
    dedupedMembers.forEach((m: any) => {
      const norm = normalizeName(m.full_name);
      nameToId[norm] = crypto.randomUUID();
    });
    // Insert all members (prevent duplicates by checking DB first)
    for (const m of dedupedMembers) {
      // Debug: log the raw member object to see property names and values
      console.log('[IMPORT DEBUG] Raw member object:', m);
      const normName = normalizeName(m.full_name);
      let id = nameToId[normName];
      let existingId = null;
      // Check for existing member in DB (by name, year, place, family)
      const { data: existingMember, error: checkError } = await supabase
        .from('family_members')
        .select('id')
        .eq('full_name', m.full_name)
        .eq('year_of_birth', m.yearOfBirth)
        .eq('living_place', m.livingPlace || m.living_place || 'Unknown')
        .eq('family_id', family.id)
        .maybeSingle();
      if (existingMember && existingMember.id) {
        existingId = existingMember.id;
        nameToId[normName] = existingId;
        console.log(`[IMPORT] Skipping insert for existing member: ${m.full_name} (ID: ${existingId})`);
      } else {
        // Robustly extract all fields
        // --- FIX: Normalize isDeceased field robustly for all common values and Excel column variants ---
        let isDeceased = false;
        const yesValues = ['yes', 'true', '1', 'y', 't'];
        const noValues = ['no', 'false', '0', 'n', 'f'];
        const getDeceasedValue = (val: any) => {
          if (typeof val === 'boolean') return val;
          if (typeof val === 'number') return val === 1;
          if (typeof val === 'string') {
            const v = val.trim().toLowerCase();
            if (yesValues.includes(v)) return true;
            if (noValues.includes(v)) return false;
          }
          return false;
        };
        const deceasedRaw = m.isDeceased ?? m.is_deceased ?? m["Is Deceased"] ?? m["is deceased"];
        isDeceased = getDeceasedValue(deceasedRaw);
        // Gender
        let gender: "male" | "female" | "other" | "unknown" = "unknown";
        if (typeof m.gender === 'string' && ["male", "female", "other", "unknown"].includes(m.gender.toLowerCase())) {
          gender = m.gender.toLowerCase() as "male" | "female" | "other" | "unknown";
        } else if (typeof m.Gender === 'string' && ["male", "female", "other", "unknown"].includes(m.Gender.toLowerCase())) {
          gender = m.Gender.toLowerCase() as "male" | "female" | "other" | "unknown";
        }
        // Occupation
        let occupation = m.occupation || '';
        // Living Place
        let livingPlace = m.livingPlace || m.living_place || 'Unknown';
        // Year of Death
        let yearOfDeath = null;
        if (m.yearOfDeath !== undefined && m.yearOfDeath !== null && m.yearOfDeath !== '') {
          yearOfDeath = Number(m.yearOfDeath);
          if (isNaN(yearOfDeath)) yearOfDeath = null;
        } else if (m.deathYear !== undefined && m.deathYear !== null && m.deathYear !== '') {
          yearOfDeath = Number(m.deathYear);
          if (isNaN(yearOfDeath)) yearOfDeath = null;
        } else if (m.year_of_death !== undefined && m.year_of_death !== null && m.year_of_death !== '') {
          yearOfDeath = Number(m.year_of_death);
          if (isNaN(yearOfDeath)) yearOfDeath = null;
        }
        const maritalStatus = typeof m.maritalStatus === 'string' && ["Single", "Married", "Divorced", "Widowed"].includes(m.maritalStatus) ? m.maritalStatus : "Single";
        const yearOfBirth = m.yearOfBirth;
        await createFamilyMember({
          id,
          name: m.full_name,
          fullName: m.full_name,
          yearOfBirth: yearOfBirth,
          yearOfDeath: yearOfDeath,
          livingPlace: livingPlace,
          isDeceased: isDeceased,
          maritalStatus,
          photoUrl: m.photoUrl || m.photo_url || null,
          relationships: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          familyId: String(family.id),
          occupation: occupation,
          gender,
        }, { skipRelationships: true });
      }
    }
    // --- NEW: Fetch all members for this family and rebuild nameToId mapping ---
    const { data: dbMembers, error: dbMembersError } = await supabase
      .from('family_members')
      .select('id, full_name')
      .eq('family_id', family.id)
    if (dbMembersError) {
      console.error('[IMPORT] Error fetching family members after insert:', dbMembersError)
      return NextResponse.json({ error: dbMembersError.message }, { status: 500 })
    }
    const dbNameToId: Record<string, string> = {}
    dbMembers.forEach((m: any) => {
      dbNameToId[(m.full_name || '').trim().toLowerCase()] = m.id
    })
    // Log relationship fields for each member before upsert
    for (const m of dedupedMembers) {
      console.log(`[IMPORT DEBUG] Member: ${m.full_name} | Parents: '${m.parents}' | Spouses: '${m.spouses}' | Children: '${m.children}'`);
    }
    // Batch up all relationships and upsert them after all members are created
    const relationshipsToInsert: any[] = [];
    const skippedRelationships: { member: string, related: string, type: string }[] = [];
    let totalRelationships = 0;
    for (const m of dedupedMembers) {
      const memberId = dbNameToId[normalizeName(m.full_name)];
      // Parents
      if (m.parents && m.parents.trim() !== "") {
        for (const parentName of m.parents.split(',').map((n: string) => n.trim()).filter(Boolean)) {
          const parentId = dbNameToId[normalizeName(parentName)];
          if (parentId) {
            // Only assign: child -> parent (type: 'parent'), parent -> child (type: 'child')
            relationshipsToInsert.push({ member_id: memberId, related_member_id: parentId, type: 'parent' }); // child -> parent
            relationshipsToInsert.push({ member_id: parentId, related_member_id: memberId, type: 'child' }); // parent -> child
            totalRelationships += 2;
            console.log(`[IMPORT] Creating parent/child relationship: ${m.full_name} (child) -> ${parentName} (parent)`);
          } else {
            skippedRelationships.push({ member: m.full_name, related: parentName, type: 'parent' });
            console.warn(`[IMPORT] Skipped parent relationship: ${m.full_name} -> ${parentName} (not found)`);
          }
        }
      }
      // Children
      if (m.children && m.children.trim() !== "") {
        for (const childName of m.children.split(',').map((n: string) => n.trim()).filter(Boolean)) {
          const childId = dbNameToId[normalizeName(childName)];
          if (childId) {
            // Only assign: parent -> child (type: 'child'), child -> parent (type: 'parent')
            relationshipsToInsert.push({ member_id: memberId, related_member_id: childId, type: 'child' }); // parent -> child
            relationshipsToInsert.push({ member_id: childId, related_member_id: memberId, type: 'parent' }); // child -> parent
            totalRelationships += 2;
            console.log(`[IMPORT] Creating child/parent relationship: ${m.full_name} (parent) -> ${childName} (child)`);
          } else {
            skippedRelationships.push({ member: m.full_name, related: childName, type: 'child' });
            console.warn(`[IMPORT] Skipped child relationship: ${m.full_name} -> ${childName} (not found)`);
          }
        }
      }
      // Spouses
      if (m.spouses && m.spouses.trim() !== "") {
        for (const spouseName of m.spouses.split(',').map((n: string) => n.trim()).filter(Boolean)) {
          const spouseId = dbNameToId[normalizeName(spouseName)];
          if (spouseId) {
            relationshipsToInsert.push({ member_id: memberId, related_member_id: spouseId, type: 'spouse' });
            relationshipsToInsert.push({ member_id: spouseId, related_member_id: memberId, type: 'spouse' });
            totalRelationships += 2;
            console.log(`[IMPORT] Creating spouse relationship: ${m.full_name} <-> ${spouseName}`);
          } else {
            skippedRelationships.push({ member: m.full_name, related: spouseName, type: 'spouse' });
            console.warn(`[IMPORT] Skipped spouse relationship: ${m.full_name} -> ${spouseName} (not found)`);
          }
        }
      }
    }
    // Log the relationshipsToInsert array
    console.log('[IMPORT DEBUG] relationshipsToInsert:', JSON.stringify(relationshipsToInsert, null, 2));
    // Remove duplicate relationships
    const relSet = new Set();
    const uniqueRelationships = relationshipsToInsert.filter(rel => {
      const key = `${rel.member_id}-${rel.related_member_id}-${rel.type}`;
      if (relSet.has(key)) return false;
      relSet.add(key);
      return true;
    });
    if (uniqueRelationships.length > 0) {
      console.log('[IMPORT] Attempting to upsert relationships:', JSON.stringify(uniqueRelationships, null, 2));
      const { error: relUpsertError, data: relUpsertData } = await supabase.from('relationships').upsert(uniqueRelationships, {
        onConflict: 'member_id,related_member_id,type',
        ignoreDuplicates: true
      });
      if (relUpsertError) {
        console.error('[IMPORT] Relationship upsert error:', relUpsertError);
      } else {
        console.log('[IMPORT] Relationship upsert success:', relUpsertData);
      }
    }
    // Logging summary
    console.info(`[IMPORT] Family '${name}' imported by user '${userId}'.`);
    console.info(`[IMPORT] Members imported: ${dedupedMembers.length}`);
    console.info(`[IMPORT] Relationships created: ${uniqueRelationships.length} (raw: ${totalRelationships})`);
    if (skippedRelationships.length > 0) {
      console.warn(`[IMPORT] Skipped relationships due to missing members:`, skippedRelationships);
    }
    return NextResponse.json({ familyId: family.id }, { status: 200 });
  } catch (err: any) {
    console.error('[IMPORT] Fatal error:', err.message || err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}

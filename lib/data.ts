import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { FamilyMember, Family, FamilyAccess, User, AppSettings } from "@/lib/types"

// Admin-only operations
export async function getFamilyMembers(familyId?: string): Promise<FamilyMember[]> {
  const supabase = createAdminClient()

  try {
    // First, fetch the family members
    let query = supabase.from("family_members").select("*")

    if (familyId) {
      query = query.eq("family_id", familyId)
    }

    const { data: members, error: membersError } = await query

    if (membersError) {
      console.error("Error fetching family members:", membersError)
      return []
    }

    if (!members || members.length === 0) {
      return []
    }

    // Then, fetch all relationships for these members
    const memberIds = members.map((member) => member.id)
    const { data: relationships, error: relError } = await supabase
      .from("relationships")
      .select("*")
      .in("member_id", memberIds)

    if (relError) {
      console.error("Error fetching relationships:", relError)
      // Return members without relationships
      return members.map((member) => ({
        id: member.id,
        fullName: member.full_name,
        yearOfBirth: member.year_of_birth,
        livingPlace: member.living_place,
        isDeceased: member.is_deceased,
        maritalStatus: member.marital_status,
        photoUrl: member.photo_url,
        relationships: [],
        createdAt: member.created_at,
        updatedAt: member.updated_at,
        familyId: member.family_id,
        occupation: member.occupation
      }))
    }

    // Map the database fields to our FamilyMember type and combine with relationships
    return members.map((member) => {
      const memberRelationships = relationships
        ? relationships
            .filter((rel) => rel.member_id === member.id)
            .map((rel) => ({
              type: rel.type,
              relatedMemberId: rel.related_member_id,
            }))
        : []

      return {
        id: member.id,
        fullName: member.full_name,
        yearOfBirth: member.year_of_birth,
        livingPlace: member.living_place,
        isDeceased: member.is_deceased,
        maritalStatus: member.marital_status,
        photoUrl: member.photo_url,
        relationships: memberRelationships,
        createdAt: member.created_at,
        updatedAt: member.updated_at,
        familyId: member.family_id,
        occupation: member.occupation
      }
    })
  } catch (error) {
    console.error("Error in getFamilyMembers:", error)
    return []
  }
}

export async function getFamilyMemberById(id: string): Promise<FamilyMember | null> {
  const supabase = createAdminClient()

  try {
    // Fetch the family member
    const { data: member, error: memberError } = await supabase.from("family_members").select("*").eq("id", id).single()

    if (memberError) {
      console.error("Error fetching family member:", memberError)
      return null
    }

    // Fetch relationships for this member
    const { data: relationships, error: relError } = await supabase
      .from("relationships")
      .select("*")
      .eq("member_id", id)

    if (relError) {
      console.error("Error fetching relationships:", relError)
      // Return member without relationships
      return {
        id: member.id,
        fullName: member.full_name,
        yearOfBirth: member.year_of_birth,
        livingPlace: member.living_place,
        isDeceased: member.is_deceased,
        maritalStatus: member.marital_status,
        photoUrl: member.photo_url,
        relationships: [],
        createdAt: member.created_at,
        updatedAt: member.updated_at,
        familyId: member.family_id,
        occupation: member.occupation
      }
    }

    // Map the relationships
    const memberRelationships = relationships
      ? relationships.map((rel) => ({
          type: rel.type,
          relatedMemberId: rel.related_member_id,
        }))
      : []

    // Return the complete family member
    return {
      id: member.id,
      fullName: member.full_name,
      yearOfBirth: member.year_of_birth,
      livingPlace: member.living_place,
      isDeceased: member.is_deceased,
      maritalStatus: member.marital_status,
      photoUrl: member.photo_url,
      relationships: memberRelationships,
      createdAt: member.created_at,
      updatedAt: member.updated_at,
      familyId: member.family_id,
      occupation: member.occupation
    }
  } catch (error) {
    console.error("Error in getFamilyMemberById:", error)
    return null
  }
}

// Mixed access operations - uses regular client since it handles public/private access internally
export async function getFamilies(): Promise<Family[]> {
  const supabase = createClient()

  const { data, error } = await supabase.from("families").select("*")

  if (error) {
    console.error("Error fetching families:", error)
    return []
  }

  return data as Family[]
}

export async function getFamilyById(id: string): Promise<Family | null> {
  const supabase = createClient()

  const { data, error } = await supabase.from("families").select("*").eq("id", id).single()

  if (error) {
    console.error("Error fetching family:", error)
    return null
  }

  return data as Family
}

export async function getAccessibleFamilies(userId: string): Promise<Family[]> {
  const supabase = createClient()

  // First check if privacy is enabled
  const { data: settings } = await supabase.from("app_settings").select("*").single()
  const privacyEnabled = settings?.privacy_enabled ?? true

  // If privacy is disabled, return all families
  if (!privacyEnabled) {
    return getFamilies()
  }

  // Get families the user has access to
  const { data, error } = await supabase
    .from("user_family_access")
    .select("*, family:families(*)")
    .eq("user_id", userId)
    .eq("status", "approved")

  if (error) {
    console.error("Error fetching accessible families:", error)
    return []
  }

  // Also get public families
  const { data: publicFamilies, error: publicError } = await supabase.from("families").select("*").eq("is_public", true)

  if (publicError) {
    console.error("Error fetching public families:", publicError)
    return []
  }

  // Combine user's families and public families, removing duplicates
  const accessibleFamilies = data.map((access) => access.family as Family)
  const allFamilies = [...accessibleFamilies]

  publicFamilies.forEach((publicFamily) => {
    if (!allFamilies.some((f) => f.id === publicFamily.id)) {
      allFamilies.push(publicFamily as Family)
    }
  })

  return allFamilies
}

export async function getUserAccessRequests(userId: string): Promise<(FamilyAccess & { family: Family })[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("user_family_access")
    .select("*, family:families(*)")
    .eq("user_id", userId)

  if (error) {
    console.error("Error fetching user access requests:", error)
    return []
  }

  return data as (FamilyAccess & { family: Family })[]
}

export async function getUserFamilyAccess(userId: string): Promise<FamilyAccess[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("user_family_access")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "approved")

  if (error) {
    console.error("Error fetching user family access:", error)
    return []
  }

  return data as FamilyAccess[]
}

// Admin-only operations
export async function getPendingAccessRequests(): Promise<(FamilyAccess & { user: User; family: Family })[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("user_family_access")
    .select("*, user:users(*), family:families(*)")
    .eq("status", "pending")

  if (error) {
    console.error("Error fetching pending access requests:", error)
    return []
  }

  return data as (FamilyAccess & { user: User; family: Family })[]
}

export async function getFamilyUsers(familyId: string): Promise<(FamilyAccess & { user: User })[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("user_family_access")
    .select("*, user:users(*)")
    .eq("family_id", familyId)
    .eq("status", "approved")

  if (error) {
    console.error("Error fetching family users:", error)
    return []
  }

  return data as (FamilyAccess & { user: User })[]
}

// Super admin operations
export async function getUsers(): Promise<User[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.from("users").select("*")

  if (error) {
    console.error("Error fetching users:", error)
    return []
  }

  return data as User[]
}

export async function searchFamilies(query: string): Promise<Family[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("families")
    .select("*")
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)

  if (error) {
    console.error("Error searching families:", error)
    return []
  }

  return data as Family[]
}

export async function getAppSettings(): Promise<AppSettings | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.from("app_settings").select("*").single()

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "no rows returned" error
    console.error("Error fetching app settings:", error)
    return null
  }

  if (!data) {
    // Create default settings if none exist
    const { data: newSettings, error: createError } = await supabase
      .from("app_settings")
      .insert({
        privacy_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error("Error creating default app settings:", createError)
      return null
    }

    return {
      id: newSettings.id,
      privacyEnabled: newSettings.privacy_enabled,
      updatedAt: newSettings.updated_at,
    }
  }

  return {
    id: data.id,
    privacyEnabled: data.privacy_enabled,
    updatedAt: data.updated_at,
  }
}

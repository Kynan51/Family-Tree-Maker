"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { FamilyMember } from "@/lib/types"
import { revalidatePath } from "next/cache"

export async function createFamilyMember(member: FamilyMember) {
  const supabase = createAdminClient() // Admin operation

  try {
    // Validate required fields
    if (!member.familyId) {
      throw new Error("familyId is required")
    }
    if (!member.fullName) {
      throw new Error("fullName is required")
    }
    if (!member.yearOfBirth) {
      throw new Error("yearOfBirth is required")
    }
    if (!member.livingPlace) {
      throw new Error("livingPlace is required")
    }

    // Check for existing member with same details
    const { data: existingMember, error: checkError } = await supabase
      .from("family_members")
      .select("*")
      .eq("full_name", member.fullName)
      .eq("year_of_birth", member.yearOfBirth)
      .eq("living_place", member.livingPlace)
      .eq("family_id", member.familyId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error("Error checking for existing member:", checkError)
      throw new Error(`Failed to check for existing member: ${checkError.message}`)
    }

    // If member exists, return it instead of creating a new one
    if (existingMember) {
      // console.log("Member already exists, returning existing member:", existingMember)
      return existingMember
    }

    // Extract relationships to insert separately
    const relationships = member.relationships || []
    const memberWithoutRelationships = { 
      full_name: member.fullName,
      year_of_birth: member.yearOfBirth,
      living_place: member.livingPlace,
      is_deceased: member.isDeceased,
      marital_status: member.maritalStatus,
      photo_url: member.photoUrl,
      created_at: member.createdAt,
      updated_at: member.updatedAt,
      family_id: member.familyId,
      occupation: member.occupation || null
    }

    // console.log("Inserting new member:", JSON.stringify(memberWithoutRelationships, null, 2))

    // Insert family member
    const { data: memberData, error: memberError } = await supabase
      .from("family_members")
      .insert(memberWithoutRelationships)
      .select()
      .single()

    if (memberError) {
      console.error("Error creating family member:", memberError)
      console.error("Full error details:", JSON.stringify(memberError, null, 2))
      throw new Error(`Failed to create family member: ${memberError.message}`)
    }

    // Insert relationships
    if (relationships.length > 0) {
      // Create all relationships in a single transaction
      const allRelationships = relationships
        .filter(rel => rel.relatedMemberId)
        .flatMap(rel => {
          const directRelationship = {
            member_id: memberData.id,
            related_member_id: rel.relatedMemberId,
            type: rel.type,
          }

          let reciprocalType: "parent" | "child" | "spouse" = "spouse"
          if (rel.type === "parent") {
            reciprocalType = "child"
          } else if (rel.type === "child") {
            reciprocalType = "parent"
          }

          const reciprocalRelationship = {
            member_id: rel.relatedMemberId,
            related_member_id: memberData.id,
            type: reciprocalType,
          }

          return [directRelationship, reciprocalRelationship]
        })

      if (allRelationships.length > 0) {
        // console.log("Inserting relationships:", JSON.stringify(allRelationships, null, 2))

        // Use upsert to handle potential duplicates gracefully
        const { error: relError } = await supabase
          .from("relationships")
          .upsert(allRelationships, {
            onConflict: 'member_id,related_member_id,type',
            ignoreDuplicates: true
          })

        if (relError) {
          console.error("Error creating relationships:", relError)
          console.error("Full relationship error details:", JSON.stringify(relError, null, 2))
          throw new Error(`Failed to create relationships: ${relError.message}`)
        }
      }
    }

    revalidatePath("/tree")
    revalidatePath("/admin")

    return memberData
  } catch (error) {
    console.error("Error in createFamilyMember:", error)
    throw error
  }
}

export async function updateFamilyMember(member: FamilyMember) {
  const supabase = createAdminClient() // Admin operation

  // Extract relationships to update separately
  const relationships = member.relationships || []
  const memberWithoutRelationships = { ...member }
  delete memberWithoutRelationships.relationships

  // Update family member
  const { data: memberData, error: memberError } = await supabase
    .from("family_members")
    .update(memberWithoutRelationships)
    .eq("id", member.id)
    .select()
    .single()

  if (memberError) {
    console.error("Error updating family member:", memberError)
    throw new Error("Failed to update family member")
  }

  // Delete existing relationships for this member
  const { error: deleteError } = await supabase
    .from("relationships")
    .delete()
    .eq("member_id", member.id)

  if (deleteError) {
    console.error("Error deleting relationships:", deleteError)
    throw new Error("Failed to delete relationships")
  }

  // Delete existing reciprocal relationships
  const { error: deleteReciprocalError } = await supabase
    .from("relationships")
    .delete()
    .eq("related_member_id", member.id)

  if (deleteReciprocalError) {
    console.error("Error deleting reciprocal relationships:", deleteReciprocalError)
    throw new Error("Failed to delete reciprocal relationships")
  }

  // Insert new relationships
  if (relationships.length > 0) {
    const relationshipsWithMemberId = relationships
      .filter(rel => rel.relatedMemberId)
      .map((rel) => ({
        member_id: member.id,
        related_member_id: rel.relatedMemberId,
        type: rel.type,
      }))

    if (relationshipsWithMemberId.length > 0) {
      const { error: relError } = await supabase
        .from("relationships")
        .insert(relationshipsWithMemberId)

      if (relError) {
        console.error("Error creating relationships:", relError)
        throw new Error("Failed to create relationships")
      }

      // Create reciprocal relationships
      const reciprocalRelationships = relationshipsWithMemberId.map((rel) => {
        let reciprocalType: "parent" | "child" | "spouse" = "spouse"

        if (rel.type === "parent") {
          reciprocalType = "child"
        } else if (rel.type === "child") {
          reciprocalType = "parent"
        }

        return {
          member_id: rel.related_member_id,
          related_member_id: member.id,
          type: reciprocalType,
        }
      })

      if (reciprocalRelationships.length > 0) {
        const { error: recipError } = await supabase
          .from("relationships")
          .insert(reciprocalRelationships)

        if (recipError) {
          console.error("Error creating reciprocal relationships:", recipError)
          throw new Error("Failed to create reciprocal relationships")
        }
      }
    }
  }

  revalidatePath("/tree")
  revalidatePath("/admin")

  return memberData
}

export async function deleteFamilyMember(id: string) {
  const supabase = createAdminClient() // Admin operation

  // Delete relationships
  await supabase.from("relationships").delete().eq("member_id", id)

  // Delete reciprocal relationships
  await supabase.from("relationships").delete().eq("related_member_id", id)

  // Delete family member
  const { error } = await supabase.from("family_members").delete().eq("id", id)

  if (error) {
    console.error("Error deleting family member:", error)
    throw new Error("Failed to delete family member")
  }

  revalidatePath("/tree")
  revalidatePath("/admin")

  return true
}

export async function requestFamilyAccess(userId: string, familyId: string) {
  const supabase = createClient() // Regular user operation

  const { error } = await supabase.from("user_family_access").insert({
    user_id: userId,
    family_id: familyId,
    access_level: "viewer",
    status: "pending",
    requested_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (error) {
    console.error("Error requesting family access:", error)
    throw new Error("Failed to request family access")
  }

  revalidatePath("/dashboard")
  revalidatePath("/admin/access-requests")

  return true
}

export async function updateAccessRequest(userId: string, familyId: string, status: "approved" | "rejected") {
  const supabase = createAdminClient() // Admin operation

  const { error } = await supabase
    .from("user_family_access")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("family_id", familyId)

  if (error) {
    console.error(`Error ${status} access request:`, error)
    throw new Error(`Failed to ${status} access request`)
  }

  revalidatePath("/dashboard")
  revalidatePath("/admin/access-requests")

  return true
}

export async function updateUserAccessLevel(
  userId: string,
  familyId: string,
  accessLevel: "viewer" | "editor" | "admin",
) {
  const supabase = createAdminClient() // Admin operation

  // Check if user already has access
  const { data, error: checkError } = await supabase
    .from("user_family_access")
    .select("*")
    .eq("user_id", userId)
    .eq("family_id", familyId)
    .single()

  if (checkError && checkError.code !== "PGRST116") {
    // PGRST116 is "no rows returned" error
    console.error("Error checking user access:", checkError)
    throw new Error("Failed to update user access level")
  }

  if (data) {
    // Update existing access
    const { error } = await supabase
      .from("user_family_access")
      .update({
        access_level: accessLevel,
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("family_id", familyId)

    if (error) {
      console.error("Error updating user access level:", error)
      throw new Error("Failed to update user access level")
    }
  } else {
    // Create new access
    const { error } = await supabase.from("user_family_access").insert({
      user_id: userId,
      family_id: familyId,
      access_level: accessLevel,
      status: "approved",
      requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error creating user access:", error)
      throw new Error("Failed to create user access")
    }
  }

  revalidatePath("/admin/family-users")
  revalidatePath(`/admin/family-users/${familyId}`)

  return true
}

export async function removeUserAccess(userId: string, familyId: string) {
  const supabase = createAdminClient() // Admin operation

  const { error } = await supabase.from("user_family_access").delete().eq("user_id", userId).eq("family_id", familyId)

  if (error) {
    console.error("Error removing user access:", error)
    throw new Error("Failed to remove user access")
  }

  revalidatePath("/admin/family-users")
  revalidatePath(`/admin/family-users/${familyId}`)

  return true
}

export async function updatePrivacySettings(privacyEnabled: boolean) {
  const supabase = createAdminClient() // Admin operation

  // Check if settings exist
  const { data, error: checkError } = await supabase.from("app_settings").select("*")

  if (checkError) {
    console.error("Error checking app settings:", checkError)
    throw new Error("Failed to update privacy settings")
  }

  if (data && data.length > 0) {
    // Update existing settings
    const { error } = await supabase
      .from("app_settings")
      .update({
        privacy_enabled: privacyEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data[0].id)

    if (error) {
      console.error("Error updating privacy settings:", error)
      throw new Error("Failed to update privacy settings")
    }
  } else {
    // Create new settings
    const { error } = await supabase.from("app_settings").insert({
      privacy_enabled: privacyEnabled,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error creating privacy settings:", error)
      throw new Error("Failed to create privacy settings")
    }
  }

  revalidatePath("/admin/settings")
  revalidatePath("/dashboard")
  revalidatePath("/tree")

  return true
}

export async function updateUserRole(userId: string, role: "admin" | "viewer") {
  const supabase = createAdminClient() // Super admin operation

  const { error } = await supabase
    .from("users")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) {
    console.error("Error updating user role:", error)
    throw new Error("Failed to update user role")
  }

  revalidatePath("/super-admin/users")
  return true
}

export async function updateUserProfile(userId: string, name: string, bio: string, photoUrl?: string) {
  const supabase = createClient() // Regular user operation

  const updateData: any = {
    name,
    bio,
    updated_at: new Date().toISOString(),
  }

  if (photoUrl) {
    updateData.photo_url = photoUrl
  }

  const { error } = await supabase.from("users").update(updateData).eq("id", userId)

  if (error) {
    console.error("Error updating user profile:", error)
    throw new Error("Failed to update user profile")
  }

  revalidatePath("/profile")
  return true
}

export async function logExport(userId: string, exportType: string, familyId?: string) {
  const supabase = createClient() // Regular user operation

  const logData: any = {
    user_id: userId,
    export_type: exportType,
    created_at: new Date().toISOString(),
  }

  if (familyId) {
    logData.family_id = familyId
  }

  const { error } = await supabase.from("export_logs").insert(logData)

  if (error) {
    console.error("Error logging export:", error)
    // Don't throw here, just log the error
  }

  return true
}

export async function createAdminAccess(userId: string, familyId: string) {
  const supabase = createAdminClient() // Admin operation

  try {
    const { error } = await supabase.from("user_family_access").insert({
      user_id: userId,
      family_id: familyId,
      access_level: "admin",
      status: "approved",
      requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error creating admin access:", error)
      throw new Error(`Failed to create admin access: ${error.message}`)
    }

    return true
  } catch (error) {
    console.error("Error in createAdminAccess:", error)
    throw error
  }
}

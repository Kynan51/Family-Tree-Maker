import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/get-session"
import { FamilyTreeView } from "@/components/family-tree-view"
import { createClient } from "@/lib/supabase/server"
import { ClientAuthFallback } from "@/components/client-auth-fallback"
import type { FamilyAccess } from "@/lib/types"
import Link from "next/link"
import { useState } from "react"
import { FamilyTreeRootMemberForm } from "@/components/family-tree-root-member-form"
import { ShareButton } from "@/components/share-button"

interface FamilyTreePageProps {
  params: {
    familyId: string
  }
}

export default async function FamilyTreePage({ params }: FamilyTreePageProps) {
  const session = await getServerSession()
  const supabase = createClient()

  // Get family data
  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("*")
    .eq("id", params.familyId)
    .single()

  if (familyError) {
    console.error("Error fetching family:", familyError)
    return <div>Error loading family data</div>
  }

  // Check if user has access to the family
  let hasAccess = false
  let isAdmin = false

  if (session) {
    // Check if user is admin
    const { data: adminAccess } = await supabase
      .from("user_family_access")
      .select("access_level")
      .eq("user_id", session.user.id)
      .eq("family_id", params.familyId)
      .eq("status", "approved")
      .eq("access_level", "admin")
      .single()

    isAdmin = !!adminAccess || session.user.role === "super_admin"

    // Check if user has any access
    const { data: userAccess } = await supabase
      .from("user_family_access")
      .select("status")
      .eq("user_id", session.user.id)
      .eq("family_id", params.familyId)
      .eq("status", "approved")
      .single()

    hasAccess = !!userAccess
  }

  // If family is private and user doesn't have access, show access request page
  if (!family.is_public && !hasAccess) {
    if (!session) {
      return (
        <div className="container mx-auto py-6 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold mb-6">{family.name}</h1>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Private Family Tree</h2>
            <p className="mb-6 text-center text-gray-600 dark:text-gray-300">This family tree is private. Please log in to request access.</p>
            <Link href="/login" className="block w-full text-center px-6 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition">
              Log In
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto py-6 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-6">{family.name}</h1>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center">Private Family Tree</h2>
          <p className="mb-6 text-center text-gray-600 dark:text-gray-300">This family tree is private. Request access to view it.</p>
          <form action="/api/request-access" method="POST" className="space-y-4">
            <input type="hidden" name="familyId" value={params.familyId} />
            <button type="submit" className="w-full px-6 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition">
              Request Access
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Get family members
  const { data: members, error: membersError } = await supabase
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
    .eq("family_id", params.familyId)

  if (membersError) {
    console.error("Error fetching members:", membersError)
    return <div>Error loading family members</div>
  }

  // Transform the data for the tree view
  const safeMembers = members || []
  const transformedMembers = safeMembers.map((member) => ({
    ...member,
    name: member.full_name,
    children: [],
  }))

  // If there are no members, show a root-member form (only for admins)
  if (safeMembers.length === 0) {
    if (!session) {
      return (
        <div className="container mx-auto py-6 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold mb-6">{family.name}</h1>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Empty Family Tree</h2>
            <p className="mb-6 text-center text-gray-600 dark:text-gray-300">This family tree is empty. Please log in to add members.</p>
            <Link href="/login" className="block w-full text-center px-6 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition">
              Log In
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto py-6 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-6">{family.name}</h1>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center">Start Your Family Tree</h2>
          <p className="mb-6 text-center text-gray-600 dark:text-gray-300">Add the first (oldest) person to begin your family tree.</p>
          <FamilyTreeRootMemberForm familyId={params.familyId} userId={session.user.id} />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">{family.name}</h1>
      {/* Import from Excel Button and Share Button */}
      <div className="mb-8 flex justify-start gap-4">
        {isAdmin && (
          <Link href={`/tree/${params.familyId}/import`}>
            <button className="px-6 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition font-semibold">
              Import Members from Excel
            </button>
          </Link>
        )}
        <ShareButton familyId={params.familyId} familyName={family.name} isPublic={family.is_public} />
      </div>
      {/* Add Member Form - Only show for admins */}
      {isAdmin && (
        <div className="mb-10 p-6 bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 max-w-xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Add Family Member</h2>
          <form method="POST" action="#">
            <div className="mb-4">
              <label className="block mb-1 font-medium">Full Name</label>
              <input name="fullName" required className="w-full border rounded px-3 py-2" />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Year of Birth</label>
              <input name="yearOfBirth" type="number" required className="w-full border rounded px-3 py-2" />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Living Place</label>
              <input name="livingPlace" required className="w-full border rounded px-3 py-2" />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Marital Status</label>
              <select name="maritalStatus" required className="w-full border rounded px-3 py-2">
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Occupation</label>
              <input name="occupation" className="w-full border rounded px-3 py-2" />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Deceased?</label>
              <select name="isDeceased" required className="w-full border rounded px-3 py-2">
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Add as Admin?</label>
              <div className="flex gap-4">
                <label><input type="radio" name="addAsAdmin" value="yes" /> Yes</label>
                <label><input type="radio" name="addAsAdmin" value="no" defaultChecked /> No</label>
              </div>
            </div>
            <button type="submit" className="w-full bg-green-700 text-white py-2 rounded hover:bg-green-800 font-semibold">Add Member</button>
          </form>
        </div>
      )}
      <FamilyTreeView 
        familyMembers={transformedMembers} 
        isAdmin={isAdmin} 
        familyId={params.familyId}
      />
    </div>
  )
}

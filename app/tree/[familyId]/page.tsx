import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/get-session"
import { FamilyTreeView } from "@/components/family-tree-view"
import { createClient } from "@/lib/supabase/server"
import { ClientAuthFallback } from "@/components/client-auth-fallback"
import type { FamilyAccess } from "@/lib/types"
import Link from "next/link"
import { useState } from "react"
import { FamilyTreeRootMemberForm } from "@/components/family-tree-root-member-form"

interface FamilyTreePageProps {
  params: {
    familyId: string
  }
}

export default async function FamilyTreePage({ params }: FamilyTreePageProps) {
  const session = await getServerSession()

  if (!session) {
    return <ClientAuthFallback />
  }

  const supabase = createClient()
  const isAdmin = session.user.role === "admin" || session.user.role === "super_admin"

  // First check if the family exists and if it's public
  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("*, user_family_access!inner(*)")
    .eq("id", params.familyId)
    .single()

  if (familyError) {
    console.error("Error fetching family:", familyError)
    return <div>Family not found</div>
  }

  // Check if user has access to this family
  const hasAccess =
    family.is_public ||
    family.user_family_access.some(
      (access: FamilyAccess) => access.userId === session.user.id && access.status === "approved"
    )

  if (!hasAccess) {
    return <div>You don't have access to this family tree</div>
  }

  // Get family members and their relationships
  const { data: members, error } = await supabase
    .from("family_members")
    .select("*, relationships:relationships!member_id(*)")
    .eq("family_id", params.familyId)

  if (error && error.message) {
    console.error("Error fetching family members:", error)
    return <div>Error loading family tree: {error.message}</div>
  }

  // If members is null or undefined, treat as empty array
  const safeMembers = members ?? []

  // If there are no members, show a root-member form
  if (safeMembers.length === 0) {
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
      {/* Import from Excel Button */}
      <div className="mb-8 flex justify-start">
        <Link href={`/tree/${params.familyId}/import`}>
          <button className="px-6 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition font-semibold">
            Import Members from Excel
          </button>
        </Link>
      </div>
      {/* Add Member Form */}
      <div className="mb-10 p-6 bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 max-w-xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Add Family Member</h2>
        {/* This form should POST to an API or handle client-side logic as needed */}
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
      <FamilyTreeView familyMembers={safeMembers} isAdmin={isAdmin} familyId={params.familyId} />
    </div>
  )
}

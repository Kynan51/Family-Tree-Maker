import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/get-session"
import { FamilyTreeView } from "@/components/family-tree-view"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ClientAuthFallback } from "@/components/client-auth-fallback"
import { demoFamilyMembers } from "@/lib/demo-family-tree"

export default async function TreePage() {
  const session = await getServerSession()

  if (!session) {
    return <ClientAuthFallback />
  }

  const supabase = createClient()

  // First check privacy settings and access rights
  const { data: settings } = await supabase.from("app_settings").select("privacy_enabled").single()
  const privacyEnabled = settings?.privacy_enabled ?? true

  const isAdmin = session.user.role === "admin" || session.user.role === "super_admin"

  // If privacy is disabled, use admin client to get all data
  if (!privacyEnabled) {
    const adminClient = createAdminClient()
    const { data: members, error } = await adminClient.from("family_members").select("*, relationships(*)")

    if (error) {
      console.error("Error fetching family members:", error)
      return <div>Error loading family tree</div>
    }

    return (
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Family Tree</h1>
        <FamilyTreeView familyMembers={members} isAdmin={isAdmin} />
      </div>
    )
  }

  // Otherwise, get user's accessible families and public families
  const { data: accessibleFamilies } = await supabase
    .from("user_family_access")
    .select("family_id")
    .eq("user_id", session.user.id)
    .eq("status", "approved")

  const familyIds = Array.isArray(accessibleFamilies)
    ? accessibleFamilies.map(row => row.family_id).filter(Boolean)
    : [];

  if (!familyIds || familyIds.length === 0) {
    return (
      <div className="container mx-auto py-12 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-10">Welcome to Family Tree Maker</h1>
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-3xl justify-center">
          {/* Create Family Card */}
          <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg shadow p-8 flex flex-col items-center border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold mb-2">Create Your Own Family Tree</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">Start a new family tree for your family and invite relatives to join and contribute.</p>
            <a href="/create-family" className="inline-block px-6 py-2 bg-green-700 text-white rounded hover:bg-green-800 transition">Create Family Tree</a>
          </div>
          {/* Request Access Card */}
          <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg shadow p-8 flex flex-col items-center border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold mb-2">Join an Existing Family Tree</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">Search for an existing family tree and request access to join your relatives.</p>
            <a href="/request-access" className="inline-block px-6 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition">Search & Request Access</a>
          </div>
        </div>
      </div>
    )
  }

  // Only run the query if familyIds is not empty
  const { data: members, error } = await supabase
    .from("family_members")
    .select("*, relationships:relationships!member_id(*)")
    .in('family_id', familyIds)

  const safeMembers = members ?? []

  if (error && error.message) {
    // If there is an error loading family members, treat as no families and show the two cards
    return (
      <div className="container mx-auto py-12 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-10">Welcome to Family Tree Maker</h1>
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-3xl justify-center">
          {/* Create Family Card */}
          <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg shadow p-8 flex flex-col items-center border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold mb-2">Create Your Own Family Tree</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">Start a new family tree for your family and invite relatives to join and contribute.</p>
            <a href="/create-family" className="inline-block px-6 py-2 bg-green-700 text-white rounded hover:bg-green-800 transition">Create Family Tree</a>
          </div>
          {/* Request Access Card */}
          <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg shadow p-8 flex flex-col items-center border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold mb-2">Join an Existing Family Tree</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">Search for an existing family tree and request access to join your relatives.</p>
            <a href="/request-access" className="inline-block px-6 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition">Search & Request Access</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Family Tree</h1>
      <FamilyTreeView familyMembers={safeMembers} isAdmin={isAdmin} />
    </div>
  )
}

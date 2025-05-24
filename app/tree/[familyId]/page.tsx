import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/get-session"
import { FamilyTreeView } from "@/components/family-tree-view"
import { createClient } from "@/lib/supabase/server"
import { ClientAuthFallback } from "@/components/client-auth-fallback"
import type { FamilyAccess } from "@/lib/types"
import Link from "next/link"
import { FamilyTreeRootMemberForm } from "@/components/family-tree-root-member-form"
import { ShareButton } from "@/components/share-button"
import FamilyTreeClientPage from "@/components/family-tree-client-page";
import { getFamilyMembers } from "@/lib/data"

export default async function FamilyTreePage(props: { params: { familyId: string } } | { params: Promise<{ familyId: string }> }) {
  let params = props.params as any;
  if (typeof params.then === 'function') {
    params = await params;
  }
  const familyId = params.familyId;
  const session = await getServerSession()
  const supabase = createClient()

  // Get family data
  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("*")
    .eq("id", familyId)
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
      .eq("family_id", familyId)
      .eq("status", "approved")
      .eq("access_level", "admin")
      .single()

    isAdmin = !!adminAccess || session.user.role === "super_admin"

    // Check if user has any access
    const { data: userAccess } = await supabase
      .from("user_family_access")
      .select("status")
      .eq("user_id", session.user.id)
      .eq("family_id", familyId)
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
          <div className="card bg-card text-card-foreground rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Private Family Tree</h2>
            <p className="card-description mb-6 text-center">This family tree is private. Please log in to request access.</p>
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
        <div className="card bg-card text-card-foreground rounded-lg shadow-lg p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center">Private Family Tree</h2>
          <p className="card-description mb-6 text-center">This family tree is private. Request access to view it.</p>
          <form action="/api/request-access" method="POST" className="space-y-4">
            <input type="hidden" name="familyId" value={familyId} />
            <button type="submit" className="w-full px-6 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition">
              Request Access
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Get family members (with relationships)
  const members = await getFamilyMembers(familyId)

  // Transform the data for the tree view
  const safeMembers = members || []
  const transformedMembers = safeMembers.map((member) => ({
    ...member,
    name: member.fullName ?? "",
    children: [],
    relationships: member.relationships || [],
  }))

  // Debugging log
  console.log('Transformed Members:', JSON.stringify(transformedMembers, null, 2));

  // If there are no members, show a root-member form (only for admins)
  if (safeMembers.length === 0) {
    // --- PATCH: skip root member form if just imported ---
    if (typeof window !== 'undefined' && window.sessionStorage.getItem('importedFamilyId') === familyId) {
      window.sessionStorage.removeItem('importedFamilyId');
      // Show a loading or empty message instead of the form
      return (
        <div className="container mx-auto py-6 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold mb-6">{family.name}</h1>
          <div className="card bg-card text-card-foreground rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Family Tree Imported</h2>
            <p className="card-description mb-6 text-center">Your family tree was imported. If you don't see members, try refreshing.</p>
          </div>
        </div>
      );
    }
    // --- END PATCH ---
    if (!session) {
      return (
        <div className="container mx-auto py-6 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold mb-6">{family.name}</h1>
          <div className="card bg-card text-card-foreground rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Empty Family Tree</h2>
            <p className="card-description mb-6 text-center">This family tree is empty. Please log in to add members.</p>
          </div>
        </div>
      )
    }
    // Only show the root member form if there are no members and the user is an admin
    if (isAdmin) {
      return (
        <div className="container mx-auto py-6 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold mb-6">{family.name}</h1>
          <div className="card bg-card text-card-foreground rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Start Your Family Tree</h2>
            <p className="card-description mb-6 text-center">Add the first (oldest) person to begin your family tree.</p>
            <FamilyTreeRootMemberForm familyId={familyId} userId={session.user.id} />
          </div>
        </div>
      )
    }
    // If not admin, just show empty message
    return (
      <div className="container mx-auto py-6 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-6">{family.name}</h1>
        <div className="card bg-card text-card-foreground rounded-lg shadow-lg p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center">Empty Family Tree</h2>
          <p className="card-description mb-6 text-center">This family tree is empty.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-px">
      <FamilyTreeClientPage
        family={family}
        familyMembers={transformedMembers}
        isAdmin={isAdmin}
        familyId={familyId}
      />
    </div>
  )
}

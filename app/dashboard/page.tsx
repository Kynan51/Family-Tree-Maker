import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/get-session"
import { UserDashboard } from "@/components/user-dashboard"
import { AdminDashboard } from "@/components/admin-dashboard"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ClientAuthFallback } from "@/components/client-auth-fallback"

interface AccessRequest {
  id: string
  family_id: string
  status: string
}

export default async function DashboardPage() {
  const session = await getServerSession()

  if (!session) {
    return <ClientAuthFallback />
  }

  // Handle admin/super_admin view
  if (session.user.role === "admin" || session.user.role === "super_admin") {
    const adminClient = createAdminClient()
    
    // Fetch data in parallel
    const [familyMembersResult, familyResult] = await Promise.all([
      adminClient
        .from("family_members")
        .select(`
          *,
          relationships:relationships!member_id(
            type,
            related_member_id
          )
        `),
      adminClient
        .from("families")
        .select("id, is_public")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
    ])

    if (familyMembersResult.error) {
      console.error("Error fetching family members:", familyMembersResult.error)
      return <div>Error loading dashboard</div>
    }

    return (
      <AdminDashboard 
        familyMembers={familyMembersResult.data} 
        familyId={familyResult.data?.id}
        isPublic={familyResult.data?.is_public}
      />
    )
  }

  // Handle regular user view
  const supabase = createClient()

  // First get access requests to determine which families to fetch
  const { data: accessRequests } = await supabase
    .from("user_family_access")
    .select("*, family:families(*)")
    .eq("user_id", session.user.id)

  const approvedFamilyIds = accessRequests
    ?.filter((req: AccessRequest) => req.status === "approved")
    .map(req => req.family_id) || []

  // Then fetch remaining data in parallel
  const [accessibleFamiliesResult, userFamilyAccessResult] = await Promise.all([
    supabase
      .from("families")
      .select("*, members:family_members(*), admins:user_family_access!inner(user_id)")
      .in("id", approvedFamilyIds),
    supabase
      .from("user_family_access")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("status", "approved")
  ])

  return (
    <UserDashboard
      userId={session.user.id}
      accessibleFamilies={accessibleFamiliesResult.data || []}
      accessRequests={accessRequests || []}
    />
  )
}

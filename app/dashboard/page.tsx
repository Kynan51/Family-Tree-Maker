import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/get-session"
import { UserDashboard } from "@/components/user-dashboard"
import { AdminDashboard } from "@/components/admin-dashboard"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ClientAuthFallback } from "@/components/client-auth-fallback"

export default async function DashboardPage() {
  const session = await getServerSession()

  if (!session) {
    // Use client-side fallback for robust auth handling
    return <ClientAuthFallback />
  }

  // Handle admin/super_admin view
  if (session.user.role === "admin" || session.user.role === "super_admin") {
    const adminClient = createAdminClient()
    const { data: familyMembers, error } = await adminClient.from("family_members").select("*")

    if (error) {
      console.error("Error fetching family members:", error)
      return <div>Error loading dashboard</div>
    }

    return <AdminDashboard familyMembers={familyMembers} />
  }

  // Handle regular user view
  const supabase = createClient()

  // Get user's accessible families
  const { data: accessRequests } = await supabase
    .from("user_family_access")
    .select("*, family:families(*)")
    .eq("user_id", session.user.id)

  // Get user's accessible families that are approved
  const { data: accessibleFamilies } = await supabase
    .from("families")
    .select("*")
    .in("id", accessRequests?.filter(req => req.status === "approved").map(req => req.family_id) || [])

  return (
    <UserDashboard
      userId={session.user.id}
      accessibleFamilies={accessibleFamilies || []}
      accessRequests={accessRequests || []}
    />
  )
}

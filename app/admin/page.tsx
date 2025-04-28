import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/get-session"
import { AdminDashboard } from "@/components/admin-dashboard"
import { AuthCheck } from "@/components/auth-check"
import { createAdminClient } from "@/lib/supabase/admin"
import { ClientAuthFallback } from "@/components/client-auth-fallback"

export default async function AdminPage() {
  const session = await getServerSession()

  if (!session) {
    return <ClientAuthFallback />
  }

  const supabase = createAdminClient()
  const { data: familyMembers, error } = await supabase.from("family_members").select("*")

  if (error) {
    console.error("Error fetching family members:", error)
    return <div>Error loading family members</div>
  }

  return (
    <AuthCheck requiredRole="admin">
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        <AdminDashboard familyMembers={familyMembers} />
      </div>
    </AuthCheck>
  )
}

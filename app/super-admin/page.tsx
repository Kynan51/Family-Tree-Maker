import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/get-session"
import { SuperAdminDashboard } from "@/components/super-admin-dashboard"
import { createAdminClient } from "@/lib/supabase/admin"
import { ClientAuthFallback } from "@/components/client-auth-fallback"

export default async function SuperAdminPage() {
  const session = await getServerSession()

  if (!session) {
    return <ClientAuthFallback />
  }

  if (session?.user?.role !== "super_admin") {
    redirect("/dashboard")
  }

  const supabase = createAdminClient()
  const { data: users, error } = await supabase.from("users").select("*").order("role", { ascending: false })

  if (error) {
    console.error("Error fetching users:", error)
    return <div>Error loading users</div>
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Super Admin Dashboard</h1>
      <SuperAdminDashboard users={users} />
    </div>
  )
}

import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/get-session"
import { AdminSettings } from "@/components/admin-settings"
import { createAdminClient } from "@/lib/supabase/admin"
import { AuthCheck } from "@/components/auth-check"
import { ClientAuthFallback } from "@/components/client-auth-fallback"

export default async function AdminSettingsPage() {
  const session = await getServerSession()

  if (!session) {
    return <ClientAuthFallback />
  }

  const supabase = createAdminClient()
  const { data: settings, error } = await supabase.from("app_settings").select("*").single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching settings:", error)
    return <div>Error loading settings</div>
  }

  return (
    <AuthCheck requiredRole="admin">
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Admin Settings</h1>
        <AdminSettings settings={settings} />
      </div>
    </AuthCheck>
  )
}

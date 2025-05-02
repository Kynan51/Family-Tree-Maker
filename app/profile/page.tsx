import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/get-session"
import { UserProfile } from "@/components/user-profile"
import { createAdminClient } from "@/lib/supabase/admin"
import { ClientAuthFallback } from "@/components/client-auth-fallback"

export default async function ProfilePage() {
  const session = await getServerSession()

  if (!session) {
    redirect('/login')
  }

  const supabase = createAdminClient() // Using admin client for user profile data
  const { data: user, error } = await supabase.from("users").select("*").eq("id", session.user.id).single()
  
  if (error) {
    throw error;
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      <UserProfile user={user} />
    </div>
  )
}

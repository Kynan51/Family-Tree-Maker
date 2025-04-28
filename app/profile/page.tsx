import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/get-session"
import { UserProfile } from "@/components/user-profile"
import { createClient } from "@/lib/supabase/server"
import { ClientAuthFallback } from "@/components/client-auth-fallback"

export default async function ProfilePage() {
  const session = await getServerSession()

  if (!session) {
    // Use client-side fallback for robust auth handling
    return <ClientAuthFallback />
  }

  const supabase = createClient() // Using regular client for user profile data
  const { data: user, error } = await supabase.from("users").select("*").eq("id", session.user.id).single()

  if (error) {
    console.error("Error fetching user:", error)
    return <div>Error loading profile</div>
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      <UserProfile user={user} />
    </div>
  )
}

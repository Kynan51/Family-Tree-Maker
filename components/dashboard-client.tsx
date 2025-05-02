"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { AdminDashboard } from "@/components/admin-dashboard"
import { UserDashboard } from "@/components/user-dashboard"
import { createClient } from "@/lib/supabase/client"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { LoadingScreen } from "@/components/ui/loading-screen"

export function DashboardClient() {
  const router = useRouter()
  const { session, loading, error } = useSupabaseAuth()
  const [adminData, setAdminData] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/auth/signin")
    }
  }, [loading, session, router])

  useEffect(() => {
    if (!session) return
    setDataLoading(true)
    setDataError(null)
    const supabase = createClient()
    const fetchData = async () => {
      try {
        if (session.user.role === "admin" || session.user.role === "super_admin") {
          const { data: familyMembers, error } = await supabase
            .from("family_members")
            .select(`
              *,
              relationships:relationships!member_id(
                type,
                related_member_id
              )
            `)
          if (error) throw error
          setAdminData({ familyMembers })
        } else {
          // Fetch user dashboard data
          const { data: accessRequests, error: accessError } = await supabase
            .from("user_family_access")
            .select("*, family:families(*)")
            .eq("user_id", session.user.id)
          if (accessError) throw accessError
          const approvedFamilyIds = accessRequests
            ?.filter(req => req.status === "approved")
            .map(req => req.family_id) || []
          const { data: accessibleFamilies, error: familiesError } = await supabase
            .from("families")
            .select("*")
            .in("id", approvedFamilyIds)
          if (familiesError) throw familiesError
          setUserData({ accessRequests, accessibleFamilies })
        }
      } catch (err: any) {
        setDataError(err.message || "Failed to load dashboard data.")
      } finally {
        setDataLoading(false)
      }
    }
    fetchData()
  }, [session])

  if (loading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  if (!session) return null

  if (session.user.role === "admin" || session.user.role === "super_admin") {
    return <AdminDashboard userId={session.user.id} familyMembers={adminData?.familyMembers || []} isAdmin={true} />
  }

  return (
    <UserDashboard
      userId={session.user.id}
      accessibleFamilies={userData?.accessibleFamilies || []}
      accessRequests={userData?.accessRequests || []}
    />
  )
} 
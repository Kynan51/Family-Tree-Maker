import { getServerSession } from "@/lib/get-session"
import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function FamiliesPage() {
  const session = await getServerSession()

  if (!session) {
    return <div>Please sign in to view this page</div>
  }

  const supabase = createClient()

  // Get user's accessible families
  const { data: accessRequests } = await supabase
    .from("user_family_access")
    .select("*, family:families(*)")
    .eq("user_id", session.user.id)

  // Get user's accessible families that are approved
  const { data: accessibleFamilies } = await supabase
    .from("families")
    .select("*, members:family_members(*), admins:user_family_access!inner(user_id)")
    .in("id", accessRequests?.filter(req => req.status === "approved").map(req => req.family_id) || [])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">My Families</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accessibleFamilies?.map((family) => (
          <Card 
            key={family.id} 
            className="p-6"
          >
            <h3 className="text-lg font-semibold mb-2">{family.name}</h3>
            <p className="text-muted-foreground text-sm mb-4">{family.description}</p>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                {family.members?.length || 0} members
              </Badge>
              {(family.created_by === session.user.id || family.admins?.some(admin => admin.user_id === session.user.id)) && (
                <Badge variant="secondary">admin</Badge>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
} 
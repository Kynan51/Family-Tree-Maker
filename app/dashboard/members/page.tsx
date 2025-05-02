import { getServerSession } from "@/lib/get-session"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, UserPlus } from "lucide-react"
import Link from "next/link"

export default async function MembersPage() {
  const session = await getServerSession()

  if (!session) {
    return <div>Please sign in to view this page</div>
  }

  const supabase = createClient()

  // Get all family members
  const { data: members } = await supabase
    .from("family_members")
    .select("*, family:families(*)")
    .eq("user_id", session.user.id)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">My Members</h1>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {members?.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground">
            No members found
          </div>
        ) : (
          members?.map((member) => (
            <Card key={member.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{member.name}</span>
                  <Badge variant={member.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {member.role.toLowerCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Family: {member.family.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Added: {new Date(member.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Status: {member.status.toLowerCase()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 
import { getServerSession } from "@/lib/get-session"
import { createClient } from "@/lib/supabase/server"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Check, X } from "lucide-react"
import Link from "next/link"

export default async function AccessRequestsPage() {
  const session = await getServerSession()

  if (!session) {
    return <div>Please sign in to view this page</div>
  }

  const supabase = createClient()

  // Get user's access requests
  const { data: accessRequests } = await supabase
    .from("user_family_access")
    .select("*, family:families(*)")
    .eq("user_id", session.user.id)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Access Requests</h1>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Family Name</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accessRequests?.length === 0 ? (
              <TableRow key="no-requests">
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No access requests
                </TableCell>
              </TableRow>
            ) : (
              accessRequests?.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.family.name}</TableCell>
                  <TableCell>{request.requestedBy}</TableCell>
                  <TableCell>
                    <Badge variant={request.status === 'PENDING' ? 'warning' : request.status === 'APPROVED' ? 'success' : 'destructive'}>
                      {request.status.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {request.status === 'PENDING' && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 
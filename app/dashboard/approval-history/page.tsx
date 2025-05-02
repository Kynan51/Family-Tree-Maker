import { getServerSession } from "@/lib/get-session"
import { createClient } from "@/lib/supabase/server"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function ApprovalHistoryPage() {
  const session = await getServerSession()

  if (!session) {
    return <div>Please sign in to view this page</div>
  }

  const supabase = createClient()

  // Get approval history
  const { data: approvalHistory } = await supabase
    .from("approval_history")
    .select("*, family:families(*)")
    .eq("user_id", session.user.id)
    .order("createdAt", { ascending: false })

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Approval History</h1>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Family Name</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {approvalHistory?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No approval history
                </TableCell>
              </TableRow>
            ) : (
              approvalHistory?.map((history) => (
                <TableRow key={history.id}>
                  <TableCell>{history.family.name}</TableCell>
                  <TableCell>
                    <Badge variant={history.action === 'APPROVED' ? 'success' : 'destructive'}>
                      {history.action.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{history.requestedBy}</TableCell>
                  <TableCell>{new Date(history.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {history.notes || '-'}
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
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Search, Settings, Clock } from "lucide-react"
import type { FamilyMember } from "@/lib/types"
import { AddFamilyMemberDialog } from "@/components/add-family-member-dialog"
import { EditFamilyMemberDialog } from "@/components/edit-family-member-dialog"
import { DeleteFamilyMemberDialog } from "@/components/delete-family-member-dialog"

interface AdminDashboardProps {
  familyMembers: FamilyMember[]
}

export function AdminDashboard({ familyMembers: initialMembers }: AdminDashboardProps) {
  const router = useRouter()
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(initialMembers)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [memberToEdit, setMemberToEdit] = useState<FamilyMember | null>(null)
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(null)
  const filteredMembers = familyMembers.filter((member) =>
    member.fullName?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAddMember = (newMember: FamilyMember) => {
    if (!newMember.fullName) {
      console.error("Attempted to add member without fullName:", newMember);
      return;
    }
    setFamilyMembers((prev) => [...prev, newMember])
  }

  const handleUpdateMember = (updatedMember: FamilyMember) => {
    setFamilyMembers((prev) => prev.map((member) => (member.id === updatedMember.id ? updatedMember : member)))
  }

  const handleDeleteMember = (id: string) => {
    setFamilyMembers((prev) => prev.filter((member) => member.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-green-50 dark:bg-green-900/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Family Members</CardTitle>
            <Plus className="h-4 w-4 text-green-700 dark:text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{familyMembers.length}</div>
            <p className="text-xs text-muted-foreground">Manage your family tree members</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Member
            </Button>
          </CardContent>
        </Card>

        <Card
          className="bg-amber-50 dark:bg-amber-900/20 cursor-pointer"
          onClick={() => router.push("/admin/access-requests")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Access Requests</CardTitle>
            <Clock className="h-4 w-4 text-amber-700 dark:text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">View</div>
            <p className="text-xs text-muted-foreground">Manage pending access requests</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/20 cursor-pointer" onClick={() => router.push("/admin/settings")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Settings</CardTitle>
            <Settings className="h-4 w-4 text-blue-700 dark:text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Configure</div>
            <p className="text-xs text-muted-foreground">Manage application settings</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Family Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <Search className="h-4 w-4 mr-2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Birth Year</TableHead>
                  <TableHead>Living Place</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Marital Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                      No family members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.fullName}</TableCell>
                      <TableCell>{member.yearOfBirth}</TableCell>
                      <TableCell>{member.livingPlace}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs ${
                            member.isDeceased
                              ? "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                          }`}
                        >
                          {member.isDeceased ? "Deceased" : "Alive"}
                        </span>
                      </TableCell>
                      <TableCell>{member.maritalStatus}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setMemberToEdit(member)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setMemberToDelete(member)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {showAddDialog && (
        <AddFamilyMemberDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          existingMembers={familyMembers}
          onAdd={handleAddMember}
          familyId={familyMembers[0]?.familyId || ""}
        />
      )}

      {memberToEdit && (
        <EditFamilyMemberDialog
          open={!!memberToEdit}
          onOpenChange={() => setMemberToEdit(null)}
          member={memberToEdit}
          existingMembers={familyMembers}
          onUpdate={handleUpdateMember}
        />
      )}

      {memberToDelete && (
        <DeleteFamilyMemberDialog
          open={!!memberToDelete}
          onOpenChange={() => setMemberToDelete(null)}
          member={memberToDelete}
          onDelete={handleDeleteMember}
        />
      )}
    </div>
  )
}

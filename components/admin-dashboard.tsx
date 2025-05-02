"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Search, Settings, Clock, Lock, Globe } from "lucide-react"
import type { FamilyMember } from "@/lib/types"
import { AddFamilyMemberDialog } from "@/components/add-family-member-dialog"
import { EditFamilyMemberDialog } from "@/components/edit-family-member-dialog"
import { DeleteFamilyMemberDialog } from "@/components/delete-family-member-dialog"

interface AdminDashboardProps {
  familyMembers: FamilyMember[]
  familyId?: string
  isPublic?: boolean
}

export function AdminDashboard({ familyMembers: initialMembers, familyId, isPublic = false }: AdminDashboardProps) {
  const router = useRouter()
  const [familyMembers, setFamilyMembers] = useState(initialMembers)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [memberToEdit, setMemberToEdit] = useState<FamilyMember | null>(null)
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(null)

  const filteredMembers = familyMembers.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleUpdateMember = (updatedMember: FamilyMember) => {
    setFamilyMembers((prev) =>
      prev.map((member) => (member.id === updatedMember.id ? updatedMember : member))
    )
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

        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Privacy Settings</CardTitle>
            {!isPublic ? (
              <Lock className="h-4 w-4 text-blue-700 dark:text-blue-500" />
            ) : (
              <Globe className="h-4 w-4 text-blue-700 dark:text-blue-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{!isPublic ? "Private" : "Public"}</div>
                <p className="text-xs text-muted-foreground">
                  {!isPublic
                    ? "Only approved members can view this family tree"
                    : "Anyone can view this family tree"}
                </p>
              </div>
            </div>
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
                  <TableHead>Year of Birth</TableHead>
                  <TableHead>Living Place</TableHead>
                  <TableHead>Occupation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.name}</TableCell>
                    <TableCell>{member.yearOfBirth}</TableCell>
                    <TableCell>{member.livingPlace}</TableCell>
                    <TableCell>{member.occupation || "N/A"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.isDeceased
                            ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                            : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                        }`}
                      >
                        {member.isDeceased ? "Deceased" : "Living"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMemberToEdit(member)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMemberToDelete(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {showAddDialog && (
        <AddFamilyMemberDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onAdd={(newMember) => {
            setFamilyMembers((prev) => [...prev, newMember])
            setShowAddDialog(false)
          }}
        />
      )}

      {memberToEdit && (
        <EditFamilyMemberDialog
          open={true}
          onOpenChange={() => setMemberToEdit(null)}
          member={memberToEdit}
          onUpdate={handleUpdateMember}
        />
      )}

      {memberToDelete && (
        <DeleteFamilyMemberDialog
          open={true}
          onOpenChange={() => setMemberToDelete(null)}
          member={memberToDelete}
          onDelete={handleDeleteMember}
        />
      )}
    </div>
  )
}

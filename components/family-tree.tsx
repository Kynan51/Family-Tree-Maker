"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, User, Edit2, Trash2 } from "lucide-react"
import type { FamilyMember } from "@/lib/types"
import { AddFamilyMemberDialog } from "@/components/add-family-member-dialog"
import { EditFamilyMemberDialog } from "@/components/edit-family-member-dialog"
import { DeleteFamilyMemberDialog } from "@/components/delete-family-member-dialog"

interface FamilyTreeProps {
  members: FamilyMember[]
}

export function FamilyTree({ members }: FamilyTreeProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [memberToEdit, setMemberToEdit] = useState<FamilyMember | null>(null)
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(null)

  // Group members by generation
  const generations = members.reduce((acc, member) => {
    const generation = member.generation || 0
    if (!acc[generation]) {
      acc[generation] = []
    }
    acc[generation].push(member)
    return acc
  }, {} as Record<number, FamilyMember[]>)

  const handleAddMember = (newMember: FamilyMember) => {
    // This would be handled by the parent component
    console.log("New member added:", newMember)
  }

  const handleUpdateMember = (updatedMember: FamilyMember) => {
    // This would be handled by the parent component
    console.log("Member updated:", updatedMember)
  }

  const handleDeleteMember = (id: string) => {
    // This would be handled by the parent component
    console.log("Member deleted:", id)
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Family Tree</h1>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      <div className="space-y-6">
        {Object.entries(generations)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([generation, members]) => (
            <div key={generation} className="space-y-4">
              <h2 className="text-xl font-semibold">Generation {generation}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-medium">{member.fullName}</h3>
                          <p className="text-sm text-gray-500">
                            {member.yearOfBirth} - {member.isDeceased ? "Deceased" : "Present"}
                          </p>
                          <p className="text-sm text-gray-500">{member.livingPlace}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMemberToEdit(member)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMemberToDelete(member)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {member.relationships && member.relationships.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-sm font-medium">Relationships</h4>
                          <div className="space-y-1">
                            {member.relationships.map((rel) => (
                              <div key={rel.id} className="text-sm text-gray-500">
                                {rel.type}: {rel.relatedMemberName}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
      </div>

      {showAddDialog && (
        <AddFamilyMemberDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onAdd={handleAddMember}
          existingMembers={members}
        />
      )}

      {memberToEdit && (
        <EditFamilyMemberDialog
          open={true}
          onOpenChange={() => setMemberToEdit(null)}
          member={memberToEdit}
          onUpdate={handleUpdateMember}
          existingMembers={members}
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
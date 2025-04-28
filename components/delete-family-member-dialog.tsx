"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { FamilyMember } from "@/lib/types"
import { deleteFamilyMember } from "@/lib/actions"
import { toast } from "@/components/ui/use-toast"

interface DeleteFamilyMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: FamilyMember
  onDelete?: (id: string) => void
}

export function DeleteFamilyMemberDialog({ open, onOpenChange, member, onDelete }: DeleteFamilyMemberDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      await deleteFamilyMember(member.id)

      if (onDelete) {
        onDelete(member.id)
      }

      toast({
        title: "Success",
        description: "Family member deleted successfully",
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Error deleting family member:", error)
      toast({
        title: "Error",
        description: "Failed to delete family member",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Family Member</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {member.fullName}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

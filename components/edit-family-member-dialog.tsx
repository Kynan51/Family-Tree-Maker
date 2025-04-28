"use client"

import type React from "react"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { FamilyMember, Relationship } from "@/lib/types"
import { updateFamilyMember } from "@/lib/actions"
import { toast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"

const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  yearOfBirth: z.coerce.number().int().min(1000).max(new Date().getFullYear()),
  livingPlace: z.string().min(2, "Living place must be at least 2 characters"),
  isDeceased: z.boolean().default(false),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]),
  photoUrl: z.string().optional(),
})

interface EditFamilyMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: FamilyMember
  existingMembers: FamilyMember[]
  onUpdate?: (member: FamilyMember) => void
}

export function EditFamilyMemberDialog({
  open,
  onOpenChange,
  member,
  existingMembers,
  onUpdate,
}: EditFamilyMemberDialogProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [selectedParents, setSelectedParents] = useState<string[]>(
    member.relationships?.filter((r) => r.type === "parent").map((r) => r.relatedMemberId) || [],
  )
  const [selectedSpouse, setSelectedSpouse] = useState<string | null>(
    member.relationships?.find((r) => r.type === "spouse")?.relatedMemberId || null,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: member.fullName,
      yearOfBirth: member.yearOfBirth,
      livingPlace: member.livingPlace,
      isDeceased: member.isDeceased,
      maritalStatus: member.maritalStatus,
      photoUrl: member.photoUrl || "",
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)

    try {
      // Create relationships array
      const relationships: Relationship[] = []

      // Add parent relationships
      selectedParents.forEach((parentId) => {
        relationships.push({
          type: "parent",
          relatedMemberId: parentId,
        })
      })

      // Add spouse relationship
      if (selectedSpouse) {
        relationships.push({
          type: "spouse",
          relatedMemberId: selectedSpouse,
        })
      }

      // Update family member
      const updatedMember: FamilyMember = {
        ...member,
        ...values,
        relationships,
        updatedAt: new Date().toISOString(),
      }

      // Save to database
      await updateFamilyMember(updatedMember)

      // Update local state if callback provided
      if (onUpdate) {
        onUpdate(updatedMember)
      }

      toast({
        title: "Success",
        description: "Family member updated successfully",
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Error updating family member:", error)
      toast({
        title: "Error",
        description: "Failed to update family member",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.url) {
        form.setValue("photoUrl", data.url)
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Family Member</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={form.watch("fullName")}
                    onChange={(e) => form.setValue("fullName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearOfBirth">Year of Birth</Label>
                  <Input
                    id="yearOfBirth"
                    type="number"
                    value={form.watch("yearOfBirth")}
                    onChange={(e) => form.setValue("yearOfBirth", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="livingPlace">Living Place</Label>
                  <Input
                    id="livingPlace"
                    value={form.watch("livingPlace")}
                    onChange={(e) => form.setValue("livingPlace", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Select
                    value={form.watch("maritalStatus")}
                    onValueChange={(value) => form.setValue("maritalStatus", value as "Single" | "Married" | "Divorced" | "Widowed")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isDeceased"
                    checked={form.watch("isDeceased")}
                    onCheckedChange={(checked) => form.setValue("isDeceased", checked as boolean)}
                  />
                  <Label htmlFor="isDeceased">Deceased</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photoUrl">Profile Photo</Label>
                  <div className="space-y-2">
                    <Input type="file" accept="image/*" onChange={handleFileUpload} />
                    {form.watch("photoUrl") && (
                      <div className="mt-2">
                        <img
                          src={form.watch("photoUrl") || "/placeholder.svg"}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded-full"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="relationships" className="py-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Parents</h3>
                <div className="border rounded-md p-4 space-y-2 max-h-40 overflow-y-auto">
                  {existingMembers.filter((m) => m.id !== member.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No existing members to select as parents</p>
                  ) : (
                    existingMembers
                      .filter((m) => m.id !== member.id)
                      .map((existingMember) => (
                        <div key={existingMember.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`parent-${existingMember.id}`}
                            checked={selectedParents.includes(existingMember.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedParents((prev) => [...prev, existingMember.id])
                              } else {
                                setSelectedParents((prev) => prev.filter((id) => id !== existingMember.id))
                              }
                            }}
                          />
                          <label
                            htmlFor={`parent-${existingMember.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {existingMember.fullName} (b. {existingMember.yearOfBirth})
                          </label>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Spouse</h3>
                <div className="border rounded-md p-4 space-y-2 max-h-40 overflow-y-auto">
                  {existingMembers.filter((m) => m.id !== member.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No existing members to select as spouse</p>
                  ) : (
                    existingMembers
                      .filter((m) => m.id !== member.id)
                      .map((existingMember) => (
                        <div key={existingMember.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`spouse-${existingMember.id}`}
                            checked={selectedSpouse === existingMember.id}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSpouse(existingMember.id)
                              } else {
                                setSelectedSpouse(null)
                              }
                            }}
                          />
                          <label
                            htmlFor={`spouse-${existingMember.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {existingMember.fullName} (b. {existingMember.yearOfBirth})
                          </label>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {activeTab === "details" ? (
            <Button onClick={() => setActiveTab("relationships")}>Next</Button>
          ) : (
            <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

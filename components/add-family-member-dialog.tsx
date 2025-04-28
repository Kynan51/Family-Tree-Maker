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
import { createFamilyMember } from "@/lib/actions"
import { toast } from "@/components/ui/use-toast"
import { v4 as uuidv4 } from "uuid"
import { Label } from "@/components/ui/label"

const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  yearOfBirth: z.coerce.number().int().min(1000).max(new Date().getFullYear()),
  livingPlace: z.string().min(2, "Living place must be at least 2 characters"),
  isDeceased: z.boolean().default(false),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]),
  photoUrl: z.string().optional(),
})

interface AddFamilyMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingMembers: FamilyMember[]
  onAdd?: (member: FamilyMember) => void
}

export function AddFamilyMemberDialog({ open, onOpenChange, existingMembers, onAdd }: AddFamilyMemberDialogProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [selectedParents, setSelectedParents] = useState<string[]>([])
  const [selectedSpouse, setSelectedSpouse] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    yearOfBirth: "",
    livingPlace: "",
    isDeceased: false,
    generation: "0",
    relationships: [] as { type: string; relatedMemberId: string }[],
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      yearOfBirth: new Date().getFullYear() - 30,
      livingPlace: "",
      isDeceased: false,
      maritalStatus: "Single",
      photoUrl: "",
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

      // Create new family member
      const newMember: FamilyMember = {
        id: uuidv4(),
        ...values,
        relationships,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Save to database
      await createFamilyMember(newMember)

      // Update local state if callback provided
      if (onAdd) {
        onAdd(newMember)
      }

      toast({
        title: "Success",
        description: "Family member added successfully",
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Error adding family member:", error)
      toast({
        title: "Error",
        description: "Failed to add family member",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newMember: FamilyMember = {
      id: crypto.randomUUID(),
      ...formData,
      generation: parseInt(formData.generation),
    }
    onAdd(newMember)
    onOpenChange(false)
    setFormData({
      fullName: "",
      yearOfBirth: "",
      livingPlace: "",
      isDeceased: false,
      generation: "0",
      relationships: [],
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Family Member</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="py-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearOfBirth">Year of Birth</Label>
                <Input
                  id="yearOfBirth"
                  type="number"
                  value={formData.yearOfBirth}
                  onChange={(e) => setFormData({ ...formData, yearOfBirth: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="livingPlace">Living Place</Label>
                <Input
                  id="livingPlace"
                  value={formData.livingPlace}
                  onChange={(e) => setFormData({ ...formData, livingPlace: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="generation">Generation</Label>
                <Select
                  value={formData.generation}
                  onValueChange={(value) => setFormData({ ...formData, generation: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select generation" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5].map((gen) => (
                      <SelectItem key={gen} value={gen.toString()}>
                        Generation {gen}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDeceased"
                  checked={formData.isDeceased}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isDeceased: checked as boolean })
                  }
                />
                <Label htmlFor="isDeceased">Deceased</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Member</Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="relationships" className="py-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Parents</h3>
                <div className="border rounded-md p-4 space-y-2 max-h-40 overflow-y-auto">
                  {existingMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No existing members to select as parents</p>
                  ) : (
                    existingMembers.map((member) => (
                      <div key={member.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`parent-${member.id}`}
                          checked={selectedParents.includes(member.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedParents((prev) => [...prev, member.id])
                            } else {
                              setSelectedParents((prev) => prev.filter((id) => id !== member.id))
                            }
                          }}
                        />
                        <label
                          htmlFor={`parent-${member.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {member.fullName} (b. {member.yearOfBirth})
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Spouse</h3>
                <div className="border rounded-md p-4 space-y-2 max-h-40 overflow-y-auto">
                  {existingMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No existing members to select as spouse</p>
                  ) : (
                    existingMembers.map((member) => (
                      <div key={member.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`spouse-${member.id}`}
                          checked={selectedSpouse === member.id}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSpouse(member.id)
                            } else {
                              setSelectedSpouse(null)
                            }
                          }}
                        />
                        <label
                          htmlFor={`spouse-${member.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {member.fullName} (b. {member.yearOfBirth})
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

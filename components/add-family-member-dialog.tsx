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
import { createClient } from "@supabase/supabase-js"
import { createAdminAccess } from "@/lib/actions"

const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  yearOfBirth: z.coerce.number().int().min(1000).max(new Date().getFullYear()),
  livingPlace: z.string().min(2, "Living place must be at least 2 characters"),
  isDeceased: z.boolean().default(false),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]),
  photoUrl: z.string().optional(),
  isAdmin: z.boolean().default(false),
})

interface AddFamilyMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingMembers: FamilyMember[]
  onAdd?: (member: FamilyMember) => void
  source?: 'card' | 'dashboard'
  selectedMember?: FamilyMember
  familyId: string
}

export function AddFamilyMemberDialog({ 
  open, 
  onOpenChange, 
  existingMembers, 
  onAdd,
  source = 'dashboard',
  selectedMember,
  familyId
}: AddFamilyMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [relationshipType, setRelationshipType] = useState<'child' | 'parent' | 'spouse'>('child')
  const [activeTab, setActiveTab] = useState("details")
  const [selectedParents, setSelectedParents] = useState<string[]>([])
  const [selectedSpouse, setSelectedSpouse] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      yearOfBirth: new Date().getFullYear() - 30,
      livingPlace: "",
      isDeceased: false,
      maritalStatus: "Single",
      photoUrl: "",
      isAdmin: false,
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    console.log("Form values:", values); // Debug log

    try {
      // Create relationships array
      const relationships: Relationship[] = []

      if (source === 'card' && selectedMember) {
        // Card-based relationship - only create one relationship
        // Ensure we don't create duplicate relationships
        const existingRelationship = selectedMember.relationships?.find(
          rel => rel.relatedMemberId === selectedMember.id && 
          ((rel.type === 'child' && relationshipType === 'parent') || 
           (rel.type === 'parent' && relationshipType === 'child'))
        )

        if (!existingRelationship) {
          relationships.push({
            type: relationshipType,
            relatedMemberId: selectedMember.id,
          })
        }
      } else {
        // Dashboard-based relationships
        if (selectedSpouse) {
          // Only add spouse relationship if spouse is selected and doesn't already exist
          const existingSpouse = existingMembers.find(m => 
            m.relationships?.some(rel => 
              rel.relatedMemberId === selectedSpouse && 
              rel.type === 'spouse'
            )
          )

          if (!existingSpouse) {
            relationships.push({
              type: "spouse",
              relatedMemberId: selectedSpouse,
            })
          }
        }
        
        // Only add parent relationships if parents are selected and don't already exist
        if (selectedParents.length > 0) {
          const uniqueParents = selectedParents.filter(parentId => {
            const existingParent = existingMembers.find(m => 
              m.relationships?.some(rel => 
                rel.relatedMemberId === parentId && 
                rel.type === 'parent'
              )
            )
            return !existingParent
          })

          uniqueParents.forEach((parentId) => {
            relationships.push({
              type: "parent",
              relatedMemberId: parentId,
            })
          })
        }
      }

      console.log("Creating relationships:", relationships); // Debug log

      // Create new family member
      const newMember: FamilyMember = {
        id: uuidv4(),
        ...values,
        name: values.fullName,
        fullName: values.fullName,
        relationships,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        familyId: source === 'card' && selectedMember ? selectedMember.familyId : familyId,
      }

      console.log("New member object before creation:", newMember); // Debug log

      // Save to database
      const createdMember = await createFamilyMember(newMember)
      console.log("Created member from server:", createdMember);

      // Transform server response to match client-side type
      const transformedMember: FamilyMember = {
        id: createdMember.id,
        name: createdMember.full_name,
        fullName: createdMember.full_name,
        yearOfBirth: createdMember.year_of_birth,
        livingPlace: createdMember.living_place,
        isDeceased: createdMember.is_deceased,
        maritalStatus: createdMember.marital_status,
        photoUrl: createdMember.photo_url,
        relationships: newMember.relationships,
        createdAt: createdMember.created_at,
        updatedAt: createdMember.updated_at,
        familyId: createdMember.family_id,
        isAdmin: values.isAdmin,
      }

      console.log("Transformed member for client:", transformedMember); // Debug log

      // If admin access is requested and member is not deceased, create admin access
      if (values.isAdmin && !values.isDeceased) {
        await createAdminAccess(transformedMember.id, transformedMember.familyId)
      }

      // Update local state if callback provided
      if (onAdd) {
        onAdd(transformedMember)
      }

      toast({
        title: "Success",
        description: "Family member added successfully",
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Error adding family member:", error)
      console.error("Error details:", { // Debug log
        values,
        familyId,
        source,
        selectedMember: selectedMember?.id,
        selectedSpouse,
        selectedParents,
      });
      toast({
        title: "Error",
        description: "Failed to add family member. Please try again.",
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
      <DialogContent className="sm:max-w-[600px]" aria-describedby="add-member-description">
        <DialogHeader>
          <DialogTitle>Add Family Member</DialogTitle>
          <p id="add-member-description" className="text-sm text-muted-foreground">
            Add a new member to your family tree. Fill in the details below and click Add Member when done.
          </p>
        </DialogHeader>

        {source === 'card' ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {selectedMember && (
                <div className="space-y-2">
                  <Label>Relationship to {selectedMember.fullName}</Label>
                  <Select
                    value={relationshipType}
                    onValueChange={(value: 'child' | 'parent' | 'spouse') => setRelationshipType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="spouse">Spouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="yearOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year of Birth</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Enter year of birth" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="livingPlace"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Living Place</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter living place" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="maritalStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marital Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select marital status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Single">Single</SelectItem>
                          <SelectItem value="Married">Married</SelectItem>
                          <SelectItem value="Divorced">Divorced</SelectItem>
                          <SelectItem value="Widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="isDeceased"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Deceased</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="isAdmin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={form.watch("isDeceased")}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Make Admin</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Member"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="relationships">Relationships</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="py-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="yearOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year of Birth</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Enter year of birth" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="livingPlace"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Living Place</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter living place" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="maritalStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marital Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select marital status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Single">Single</SelectItem>
                              <SelectItem value="Married">Married</SelectItem>
                              <SelectItem value="Divorced">Divorced</SelectItem>
                              <SelectItem value="Widowed">Widowed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="isDeceased"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Deceased</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="isAdmin"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={form.watch("isDeceased")}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Make Admin</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setActiveTab("relationships")}>
                      Next
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
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

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setActiveTab("details")}>
                    Back
                  </Button>
                  <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

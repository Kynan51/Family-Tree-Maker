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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  yearOfBirth: z.coerce.number().int().min(1000).max(new Date().getFullYear()),
  livingPlace: z.string().min(2, "Living place must be at least 2 characters"),
  isDeceased: z.boolean().default(false),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]),
  photoUrl: z.string().optional(),
  isAdmin: z.boolean().default(false),
  occupation: z.string().optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).default("unknown"),
})

interface AddFamilyMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingMembers: FamilyMember[]
  onAdd?: (member: FamilyMember) => void
  source?: 'card' | 'dashboard'
  selectedMember?: FamilyMember
  familyId: string
  isAdmin?: boolean
}

export function AddFamilyMemberDialog({ 
  open, 
  onOpenChange, 
  existingMembers, 
  onAdd,
  source = 'dashboard',
  selectedMember,
  familyId,
  isAdmin = false
}: AddFamilyMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [relationshipType, setRelationshipType] = useState<'child' | 'parent' | 'spouse'>('child')
  const [activeTab, setActiveTab] = useState("details")
  const [selectedParents, setSelectedParents] = useState<string[]>([])
  const [selectedSpouse, setSelectedSpouse] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      yearOfBirth: undefined,
      livingPlace: "",
      isDeceased: false,
      maritalStatus: "Single",
      photoUrl: "",
      isAdmin: false,
      occupation: undefined,
      gender: "unknown",
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!values.fullName) {
        throw new Error("Full name is required")
      }

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
        occupation: values.occupation || "",
      }

      // Validate the member object before sending to server
      if (!newMember.fullName) {
        throw new Error("Full name is required")
      }

      // Save to database
      const { data: createdMember, error } = await createFamilyMember(newMember)
      if (error) throw error

      // If admin access is requested and member is not deceased, create admin access
      if (values.isAdmin && !values.isDeceased) {
        await createAdminAccess(createdMember.id, createdMember.family_id)
      }

      // Update local state if callback provided
      if (onAdd) {
        onAdd(createdMember)
      }

      toast.success("Family member added successfully")

      onOpenChange(false)
    } catch (error) {
      console.error("Error adding family member:", error)
      console.error("Error details:", {
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
    setIsUploading(true)
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
    } finally {
      setIsUploading(false)
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
                        <Input type="number" placeholder="Year of birth (e.g. 1995)" {...field} />
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
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Occupation</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter occupation (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="unknown">Unknown</SelectItem>
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

              {isAdmin && !form.watch("isDeceased") && (
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
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Make Admin</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Member'
                  )}
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
                            <Input type="number" placeholder="Year of birth (e.g. 1995)" {...field} />
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
                      name="occupation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Occupation</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter occupation (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="unknown">Unknown</SelectItem>
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
                      <RadioGroup
                        value={selectedParents[0] || ""}
                        onValueChange={(value) => setSelectedParents([value])}
                      >
                        {existingMembers.map((member) => (
                          <div key={member.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={member.id} id={`parent-${member.id}`} />
                            <label
                              htmlFor={`parent-${member.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {member.name || member.fullName} ({member.yearOfBirth})
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Spouse</h3>
                  <div className="border rounded-md p-4 space-y-2 max-h-40 overflow-y-auto">
                    {existingMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No existing members to select as spouse</p>
                    ) : (
                      <RadioGroup
                        value={selectedSpouse || ""}
                        onValueChange={(value) => setSelectedSpouse(value)}
                      >
                        {existingMembers.map((member) => (
                          <div key={member.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={member.id} id={`spouse-${member.id}`} />
                            <label
                              htmlFor={`spouse-${member.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {member.name || member.fullName} ({member.yearOfBirth})
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setActiveTab("details")}>
                    Back
                  </Button>
                  <Button type="button" className="bg-green-600 hover:bg-green-700 text-white" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* File upload section */}
        <div className="mt-4">
          <FormField
            control={form.control}
            name="photoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profile Photo</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    {isUploading && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

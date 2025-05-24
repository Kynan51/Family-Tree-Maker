"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { useForm, type SubmitHandler } from "react-hook-form"
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
import { updateFamilyMember, getFamilyMemberRelationships } from "@/lib/actions"
import { toast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  yearOfBirth: z.coerce.number().int().min(1000).max(new Date().getFullYear()),
  livingPlace: z.string().min(2, "Living place must be at least 2 characters"),
  isDeceased: z.boolean(), // always required
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]),
  photoUrl: z.string().optional(),
  occupation: z.string().optional(),
  gender: z.enum(["male", "female", "other", "unknown"]),
})

interface EditFamilyMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: FamilyMember
  existingMembers: FamilyMember[]
  onUpdate?: (member: FamilyMember) => void
  familyId: string
}

export function EditFamilyMemberDialog({
  open,
  onOpenChange,
  member,
  existingMembers,
  onUpdate,
  familyId,
}: EditFamilyMemberDialogProps) {
  console.log('DEBUG: EditFamilyMemberDialog rendered', { open, member, familyId });

  if (!familyId) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <strong>Please select a family first to add a member.</strong>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState("details")
  const [isLoading, setIsLoading] = useState(true)
  
  // Initialize relationships from member data
  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  const [selectedSpouse, setSelectedSpouse] = useState<string[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Filter members to only show those in the same family
  const familyMembers = existingMembers.filter(
    m => m.familyId === familyId && m.id !== member.id
  );

  // Initialize form with member data
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: member.fullName || member.name || "",
      yearOfBirth: member.yearOfBirth || new Date().getFullYear(),
      livingPlace: member.livingPlace || "",
      isDeceased: member.isDeceased ?? false,
      maritalStatus: ["Single", "Married", "Divorced", "Widowed"].includes(member.maritalStatus) ? member.maritalStatus as any : "Single",
      photoUrl: member.photoUrl || "",
      occupation: member.occupation || "",
      gender: ["male", "female", "other", "unknown"].includes(member.gender) ? member.gender as any : "unknown",
    },
  })

  // Fetch relationships when member changes (only if editing existing member)
  useEffect(() => {
    if (!member.id) {
      setSelectedParents([]);
      setSelectedSpouse([]);
      setIsLoading(false);
      return;
    }
    const fetchRelationships = async () => {
      setIsLoading(true);
      try {
        const relationships = await getFamilyMemberRelationships(member.id);        // Correct prefill logic:
        // Parents: type === 'child' (I am a child of X, so X is my parent)
        // Children: type === 'parent' (I am a parent of X, so X is my child)
        const parentIds = relationships
          .filter(r => r.type === "child")
          .map(r => r.related_member_id);
        const childIds = relationships
          .filter(r => r.type === "parent")
          .map(r => r.related_member_id);
        const spouseIds = relationships
          .filter(r => r.type === "spouse")
          .map(r => r.related_member_id);
        setSelectedParents(parentIds);
        setSelectedChildren(childIds);
        setSelectedSpouse(spouseIds);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load relationships",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchRelationships();
  }, [member.id]);

  // Reset form when member changes
  useEffect(() => {
    form.reset({
      fullName: member.fullName || member.name || "",
      yearOfBirth: member.yearOfBirth || new Date().getFullYear(),
      livingPlace: member.livingPlace || "",
      isDeceased: member.isDeceased ?? false,
      maritalStatus: ["Single", "Married", "Divorced", "Widowed"].includes(member.maritalStatus) ? member.maritalStatus as any : "Single",
      photoUrl: member.photoUrl || "",
      occupation: member.occupation || "",
      gender: ["male", "female", "other", "unknown"].includes(member.gender) ? member.gender as any : "unknown",
    });
    setActiveTab("details");
  }, [member, form])

  const onSubmit: import("react-hook-form").SubmitHandler<z.infer<typeof formSchema>> = async (values) => {
    setIsSubmitting(true);
    try {
      const relationships: Relationship[] = [];
      // FIX: Swap the types for correct directionality
      selectedParents.forEach((parentId) => {
        relationships.push({ type: "child", relatedMemberId: parentId });
      });
      selectedChildren.forEach((childId) => {
        relationships.push({ type: "parent", relatedMemberId: childId });
      });
      selectedSpouse.forEach((spouseId) => {
        relationships.push({ type: "spouse", relatedMemberId: spouseId });
      });
      const updatedMember: FamilyMember = {
        id: member.id,
        name: values.fullName, // always set name
        fullName: values.fullName,
        yearOfBirth: values.yearOfBirth,
        livingPlace: values.livingPlace,
        isDeceased: values.isDeceased,
        maritalStatus: values.maritalStatus,
        photoUrl: values.photoUrl,
        occupation: values.occupation,
        relationships,
        updatedAt: new Date().toISOString(),
        familyId: member.familyId,
        createdAt: member.createdAt,
        gender: values.gender,
      };
      const savedMember = await updateFamilyMember(updatedMember);
      if (onUpdate && savedMember) {
        onUpdate(savedMember);
      }
      toast({
        title: "Success",
        description: "Family member updated successfully",
        variant: "default",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update family member",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return
    setIsUploading(true)

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
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      handleFileUpload(file)
    } else {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      })
    }
  }, [])

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" aria-describedby="edit-family-member-description">
        <DialogHeader>
          <DialogTitle>Edit Family Member</DialogTitle>
        </DialogHeader>
        <div id="edit-family-member-description" className="sr-only">
          Use this dialog to edit the details of a family member.
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="relationships">Relationships</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="py-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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

                  <FormField
                    control={form.control}
                    name="maritalStatus"
                    render={({ field }) => {
                      return (
                        <FormItem>
                          <FormLabel>Marital Status</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value)
                            }}
                            defaultValue={field.value}
                            value={field.value}
                          >
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
                      )
                    }}
                  />

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

                  <FormField
                    control={form.control}
                    name="photoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Photo</FormLabel>
                        <FormControl>
                          <div
                            className={cn(
                              "flex flex-col items-center gap-4 p-6 border-2 border-dashed rounded-lg transition-colors",
                              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                            )}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                          >
                            <div className="relative h-32 w-32">
                              <img
                                src={field.value || "/placeholder.svg?height=128&width=128"}
                                alt="Profile"
                                className="h-full w-full object-cover rounded-full"
                              />
                              {isUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                              )}
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground mb-2">
                                {isDragging ? "Drop your image here" : "Drag and drop an image here, or click to select"}
                              </p>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                                className="hidden"
                                id="profile-photo-upload"
                                disabled={isUploading}
                              />
                              <Button
                                variant="outline"
                                onClick={() => document.getElementById("profile-photo-upload")?.click()}
                                disabled={isUploading}
                              >
                                {isUploading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  'Select Image'
                                )}
                              </Button>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                    {familyMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No existing members to select as parents</p>
                    ) : (
                      familyMembers.map((existingMember) => (
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
                            {existingMember.fullName || existingMember.name} ({existingMember.yearOfBirth})
                          </label>                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Spouse</h3>
                  <div className="border rounded-md p-4 space-y-2 max-h-40 overflow-y-auto">
                    {familyMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No existing members to select as spouse</p>
                    ) : (
                      familyMembers.map((existingMember) => (
                        <div key={existingMember.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`spouse-${existingMember.id}`}
                            checked={selectedSpouse.includes(existingMember.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSpouse((prev) => [...prev, existingMember.id])
                              } else {
                                setSelectedSpouse((prev) => prev.filter((id) => id !== existingMember.id))
                              }
                            }}
                          />
                          <label
                            htmlFor={`spouse-${existingMember.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {existingMember.fullName || existingMember.name} ({existingMember.yearOfBirth})
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Children <span className="text-xs text-muted-foreground">(select people this member is a parent of)</span></h3>
                  <div className="border rounded-md p-4 space-y-2 max-h-40 overflow-y-auto">
                    {familyMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No existing members to select as children</p>
                    ) : (
                      familyMembers.map((existingMember) => (
                        <div key={existingMember.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`child-${existingMember.id}`}
                            checked={selectedChildren.includes(existingMember.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedChildren((prev) => [...prev, existingMember.id])
                              } else {
                                setSelectedChildren((prev) => prev.filter((id) => id !== existingMember.id))
                              }
                            }}
                          />
                          <label
                            htmlFor={`child-${existingMember.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {existingMember.fullName || existingMember.name} ({existingMember.yearOfBirth})
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setActiveTab("details")}>
                  Back
                </Button>
                <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

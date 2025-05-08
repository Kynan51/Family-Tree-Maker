"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/components/ui/use-toast"
import { updateUserProfile } from "@/lib/actions"
import type { User } from "@/lib/types"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  bio: z.string().optional(),
})

interface UserProfileProps {
  user: User
}

export function UserProfile({ user }: UserProfileProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name,
      bio: user.bio || "",
    },
  })

  useEffect(() => {
    // Prefill form with user data if available
    if (user) {
      form.reset({
        name: user.name || "",
        bio: user.bio || "",
      });
    }
  }, [user, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)

    try {
      await updateUserProfile(user.id, values.name, values.bio || "", user.photoUrl)

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUpload = async (file: File) => {
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
        // Update profile with new photo URL
        await updateUserProfile(user.id, user.name, user.bio || "", data.url)

        // Refresh the page to show the new photo
        window.location.reload()
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: "Error",
        description: "Failed to upload profile picture",
        variant: "destructive",
      })
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
    <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Profile Information</CardTitle>
          <CardDescription className="text-sm sm:text-base">Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" className="h-9 sm:h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Bio</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tell us about yourself" className="min-h-[80px] sm:min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" variant="success" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Profile Picture</CardTitle>
          <CardDescription className="text-sm sm:text-base">Update your profile picture</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div
            className={cn(
              "flex flex-col items-center gap-3 sm:gap-4 p-4 sm:p-6 border-2 border-dashed rounded-lg transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            )}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32">
              <AvatarImage src={user.photoUrl || "/placeholder.svg?height=128&width=128"} alt={user.name || "User"} />
              <AvatarFallback>{(user.name || "User").substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>

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
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById("profile-photo-upload")?.click()}
              >
                Select Image
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          <p>Recommended: Square image, at least 128x128 pixels</p>
        </CardFooter>
      </Card>
    </div>
  )
}

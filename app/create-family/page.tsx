"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"

export default function CreateFamilyPage() {
  const router = useRouter()
  const { session } = useSupabaseAuth()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!session) {
      setError("You must be logged in to create a family")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // Create the family
      const { data: family, error: familyError } = await supabase
        .from("families")
        .insert([
          {
            name,
            description,
            is_public: isPublic,
          },
        ])
        .select()
        .single()

      if (familyError) throw familyError

      // Create the user's access to the family
      const { error: accessError } = await supabase
        .from("user_family_access")
        .insert([
          {
            user_id: session.user.id,
            family_id: family.id,
            access_level: "admin",
            status: "approved",
          },
        ])

      if (accessError) throw accessError

      // Redirect to the new family's tree page
      router.push(`/tree/${family.id}`)
    } catch (err) {
      console.error("Error creating family:", err)
      setError("Failed to create family. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create a New Family Tree</CardTitle>
          <CardDescription>
            Start your family tree by creating a new family. You can add members and invite others later.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Family Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your family name"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (Optional)
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for your family"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isPublic" className="text-sm font-medium">
                Make this family tree public
              </label>
            </div>
            {error && (
              <div className="text-sm text-red-500">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Family Tree"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
} 
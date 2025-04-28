"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Search } from "lucide-react"
import { createClientSide } from "@/lib/supabase/client"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { requestFamilyAccess } from "@/lib/actions"

export default function RequestAccessPage() {
  const router = useRouter()
  const { session } = useSupabaseAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedFamily, setSelectedFamily] = useState<any | null>(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const searchFamilies = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        return
      }

      try {
        const supabase = createClientSide()
        const { data, error } = await supabase
          .from("families")
          .select("id, name, description")
          .ilike("name", `%${searchQuery}%`)
          .eq("is_public", true)
          .limit(5)

        if (error) throw error
        setSearchResults(data || [])
      } catch (err) {
        console.error("Error searching families:", err)
        setError("Failed to search families")
      }
    }

    const debounceTimer = setTimeout(searchFamilies, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!session) {
      setError("You must be logged in to request access")
      setIsSubmitting(false)
      return
    }

    if (!selectedFamily) {
      setError("Please select a family tree")
      setIsSubmitting(false)
      return
    }

    try {
      const result = await requestFamilyAccess(session.user.id, selectedFamily.id)
      
      if (!result.success) {
        setError(result.error || "Failed to request access. Please try again.")
        setIsSubmitting(false)
        return
      }

      // Only navigate if the request was successful
      router.push("/dashboard")
    } catch (err) {
      console.error("Error requesting access:", err)
      setError("Failed to request access. Please try again.")
      setIsSubmitting(false)
    }
  }

  if (!session) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You must be logged in to request access to a family tree.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Request Access to a Family Tree</CardTitle>
          <CardDescription>
            Search for a public family tree and request access to view it.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="search">Search Family Trees</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by family name..."
                />
                <Button type="button" variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <Label>Select a Family Tree</Label>
                <div className="space-y-2">
                  {searchResults.map((family) => (
                    <Card
                      key={family.id}
                      className={`cursor-pointer ${
                        selectedFamily?.id === family.id
                          ? "border-primary"
                          : ""
                      }`}
                      onClick={() => setSelectedFamily(family)}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-medium">{family.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {family.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {selectedFamily && (
              <div className="space-y-2">
                <Label htmlFor="message">Message to Family Admin</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell the family admin why you'd like access..."
                  required
                />
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !selectedFamily}
            >
              {isSubmitting ? "Submitting..." : "Request Access"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
} 
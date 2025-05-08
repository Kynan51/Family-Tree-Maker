"use client"

import { useState, useRef, useMemo, useEffect } from "react"
import { debounce } from "lodash"
import { Search, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { normalizeDbFields } from "@/lib/utils"
import type { Family } from "@/lib/types"

interface SearchFamiliesProps {
  onSelect: (family: Family) => void
}

export function SearchFamilies({ onSelect }: SearchFamiliesProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [results, setResults] = useState<Family[]>([])
  const [error, setError] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/search-families?query=${encodeURIComponent(searchTerm)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to search families")
      }

      // Normalize the search results
      const normalizedResults = data.families.map((family: any) => 
        normalizeDbFields<Family>(family)
      )

      setResults(normalizedResults)
    } catch (error) {
      console.error("Search error:", error)
      setError("Failed to search families")
    } finally {
      setIsLoading(false)
    }
  }

  const debouncedSearch = useMemo(
    () => debounce(handleSearch, 300),
    [searchTerm]
  )

  useEffect(() => {
    debouncedSearch()
    return () => debouncedSearch.cancel()
  }, [searchTerm, debouncedSearch])

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search families..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((family) => (
            <Card
              key={family.id}
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onSelect(family)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{family.name}</h3>
                  {family.description && (
                    <p className="text-sm text-muted-foreground">
                      {family.description}
                    </p>
                  )}
                </div>
                <Badge variant={family.isPublic ? "default" : "secondary"}>
                  {family.isPublic ? "Public" : "Private"}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && searchTerm && results.length === 0 && (
        <div className="text-center text-muted-foreground">
          No families found
        </div>
      )}
    </div>
  )
}
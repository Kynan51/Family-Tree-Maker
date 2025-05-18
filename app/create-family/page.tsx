"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import * as XLSX from "xlsx"
import { createAdminClient } from "@/lib/supabase/admin"
import { createFamilyMember } from "@/lib/actions"

type RelationshipPreview = { type: 'parent' | 'spouse' | 'child', relatedName: string };

export default function CreateFamilyPage() {
  const router = useRouter()
  const { session } = useSupabaseAuth()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false);
  const [familyCreated, setFamilyCreated] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null); // NEW: track created familyId
  const [importedMembers, setImportedMembers] = useState<any[]>([]); // Store imported members

  useEffect(() => {
    // If redirected after import, skip root member form
    if (typeof window !== 'undefined') {
      const importedFamilyId = window.sessionStorage.getItem('importedFamilyId');
      if (importedFamilyId) {
        window.sessionStorage.removeItem('importedFamilyId');
        setFamilyId(importedFamilyId); // set familyId from sessionStorage
        setFamilyCreated(true);
        router.replace(`/tree/${importedFamilyId}`);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    if (!session) {
      setError("You must be logged in to create a family")
      setIsLoading(false)
      return
    }
    if (familyId) {
      setError("A family has already been created in this session.")
      setIsLoading(false)
      return
    }
    try {
      if (importedMembers.length > 0) {
        // Use API route for import
        const res = await fetch("/api/import-family", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            isPublic,
            userId: session.user.id,
            members: importedMembers,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to import family");
        setFamilyId(String(data.familyId));
        setFamilyCreated(true);
        router.push(`/tree/${data.familyId}`);
        return;
      }
      // Manual family creation fallback
      const supabase = createClient()
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
      setFamilyId(String(family.id))
      setFamilyCreated(true)
      router.push(`/tree/${family.id}`)
    } catch (err: any) {
      console.error("Error creating family:", err)
      setError(err.message || "Failed to create family. Please try again.")
      setIsLoading(false)
    }
  }

  // Refactored import handler to accept a File
  const handleImportExcel = async (file: File) => {
    setImportError(null)
    setImportSuccess(null)
    setFileUploaded(false)
    if (!file) return
    setFileUploaded(true)
    if (!session) {
      setImportError("You must be logged in to import members.")
      return
    }
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const data = evt.target?.result
      if (!data) return
      const workbook = XLSX.read(data, { type: "binary" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      const headers = json[0] as string[]
      const rows = json.slice(1)
      if (!rows.length) {
        setImportError("No data found in the file.")
        return
      }
      // Normalize headers to lowercase and remove spaces for robust mapping
      const lowerHeaders = (headers as string[]).map(h => h.toLowerCase().replace(/\s+/g, ''))
      let missingNameCount = 0
      let missingYearCount = 0
      const members: any[] = rows.map((row, idx, allRows) => {
        const objRaw = Object.fromEntries(lowerHeaders.map((h, i) => [h, (row as any[])[i]]))
        let baseName = objRaw["name"] || objRaw["fullname"] || objRaw["full_name"] || ""
        if (typeof baseName === "string") baseName = baseName.trim()
        if (!baseName) {
          baseName = `Unknown ${idx + 1}`
          missingNameCount++
        }
        let yearOfBirth = objRaw["birthyear"] || objRaw["yearofbirth"] || objRaw["birth_year"] || objRaw["year"] || ""
        yearOfBirth = String(yearOfBirth).trim()
        let yearOfBirthNum = Number(yearOfBirth)
        if (!yearOfBirth || isNaN(yearOfBirthNum) || yearOfBirthNum < 1000 || yearOfBirthNum > 2100) {
          yearOfBirthNum = 1970 + idx
          missingYearCount++
        }
        const yearOfDeath = objRaw["deathyear"] || objRaw["yearofdeath"] || objRaw["death_year"] || ""
        const livingPlace = objRaw["livingplace"] || objRaw["living_place"] || objRaw["place"] || objRaw["location"] || "Unknown"
        const maritalStatus = objRaw["maritalstatus"] || objRaw["marital_status"] || objRaw["status"] || "Single"
        const occupation = objRaw["occupation"] || ""
        const gender = objRaw["gender"] || "unknown"
        const isDeceased = yearOfDeath && String(yearOfDeath).trim() !== '' ? true : false
        // Always map relationship fields as comma-separated strings (never arrays)
        // Use only lowercased, spaceless keys for relationship fields
        let parents = typeof objRaw["parents"] === 'string' ? objRaw["parents"].trim() : ''
        let spouses = '';
        if (typeof objRaw["spouse"] === 'string') {
          spouses = objRaw["spouse"].trim();
        } else if (typeof objRaw["spouses"] === 'string') {
          spouses = objRaw["spouses"].trim();
        }
        let children = typeof objRaw["children"] === 'string' ? objRaw["children"].trim() : ''
        // If relationships array is present, also populate parents/spouses/children fields
        if (Array.isArray(objRaw.relationships)) {
          const rels = objRaw.relationships as { type: string, relatedName: string }[];
          const parentNames = rels.filter(r => r.type === 'parent').map(r => r.relatedName).join(', ');
          const spouseNames = rels.filter(r => r.type === 'spouse').map(r => r.relatedName).join(', ');
          const childNames = rels.filter(r => r.type === 'child').map(r => r.relatedName).join(', ');
          if (!parents && parentNames) parents = parentNames;
          if (!spouses && spouseNames) spouses = spouseNames;
          if (!children && childNames) children = childNames;
        }
        // Build relationships array for preview/debugging
        const relationships: RelationshipPreview[] = [];
        if (parents) {
          parents.split(',').map((n: string) => n.trim()).filter(Boolean).forEach((parentName: string) => {
            relationships.push({ type: 'parent', relatedName: parentName })
          })
        }
        if (spouses) {
          spouses.split(',').map((n: string) => n.trim()).filter(Boolean).forEach((spouseName: string) => {
            relationships.push({ type: 'spouse', relatedName: spouseName })
          })
        }
        if (children) {
          children.split(',').map((n: string) => n.trim()).filter(Boolean).forEach((childName: string) => {
            relationships.push({ type: 'child', relatedName: childName })
          })
        }
        // Debug log for each member's relationships
        console.debug(`[IMPORT] Member: ${baseName}, Relationships:`, relationships)
        return {
          name: baseName,
          full_name: baseName,
          fullName: baseName,
          yearOfBirth: yearOfBirthNum,
          yearOfDeath: yearOfDeath && String(yearOfDeath).trim() !== '' ? Number(yearOfDeath) : undefined,
          livingPlace: livingPlace && String(livingPlace).trim() !== '' ? livingPlace : 'Unknown',
          isDeceased,
          maritalStatus: ["Single", "Married", "Divorced", "Widowed"].includes(maritalStatus) ? maritalStatus : undefined,
          occupation: occupation && String(occupation).trim() !== '' ? occupation : undefined,
          gender: ["male", "female", "other", "unknown"].includes(gender) ? gender : undefined,
          parents,
          spouses,
          children,
          photoUrl: null,
          relationships,
        }
      })
      // Log the transformed members for verification (expanded)
      console.log('[IMPORT] Transformed Members:')
      members.forEach(m => console.log(m))
      let importWarnings = []
      if (missingNameCount > 0) importWarnings.push(`${missingNameCount} member(s) had missing or empty names and were set to 'Unknown'.`)
      if (missingYearCount > 0) importWarnings.push(`${missingYearCount} member(s) had missing or invalid year of birth and were set to a default value.`)
      if (importWarnings.length > 0) setImportError(importWarnings.join(' '))
      setImportedMembers(members)
      setImportSuccess("Members imported and ready to create family!")
    }
    reader.readAsBinaryString(file)
  }

  // Drag and drop handlers
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImportExcel(file)
  }
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Import Members from Excel</label>
              {/* Drag-and-drop area */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: "none" }}
                  id="import-excel"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleImportExcel(file)
                  }}
                />
                <label htmlFor="import-excel" className="cursor-pointer block">
                  <span className="font-medium">Click to select a file</span>
                  <span className="mx-2 text-muted-foreground">or drag and drop here</span>
                </label>
              </div>
            </div>
            <div className="mb-4">
              {fileUploaded && (
                <div className="text-green-600 font-medium">File uploaded successfully!</div>
              )}
              {importError && (
                <div className="text-red-600 font-medium">{importError}</div>
              )}
              {importSuccess && (
                <div className="text-green-600 font-medium">{importSuccess}</div>
              )}
            </div>
            {error && (
              <div className="text-sm text-red-500">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={isLoading || familyCreated}>
              {isLoading ? "Creating..." : "Create Family Tree"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
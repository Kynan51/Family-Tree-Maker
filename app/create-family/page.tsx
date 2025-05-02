"use client"

import { useState } from "react"
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

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null)
    setImportSuccess(null)
    const file = e.target.files?.[0]
    if (!file) return
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
      // Create the family first
      let familyId = null
      try {
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
        familyId = family.id
        // Give user admin access
        await supabase.from("user_family_access").insert([
          {
            user_id: session.user.id,
            family_id: familyId,
            access_level: "admin",
            status: "approved",
          },
        ])
      } catch (err) {
        setImportError("Failed to create family before import.")
        return
      }
      // Parse members
      const members: any[] = rows.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])))
      // Find rootless members (no parent)
      const rootless = members.filter(m => !m.parents || m.parents.trim() === "")
      let unknownRootId: string | null = null
      let rootIds: string[] = []
      let nameToId: Record<string, string> = {}
      // Helper: check if all rootless are spouses of each other
      const allRootlessAreSpouses = () => {
        if (rootless.length < 2) return false
        const names = rootless.map(m => m.full_name)
        return rootless.every(m => {
          if (!m.spouses) return false
          const spouseNames = m.spouses.split(',').map((n: string) => n.trim()).filter(Boolean)
          // Should be all other rootless
          return names.filter(n => n !== m.full_name).every(n => spouseNames.includes(n))
        })
      }
      // If user manually entered a root (via form), treat as root
      let manualRootId: string | null = null
      if (name && !members.some(m => m.full_name === name)) {
        manualRootId = crypto.randomUUID()
        nameToId[name] = manualRootId
        await createFamilyMember({
          id: manualRootId,
          name,
          fullName: name,
          yearOfBirth: 1950,
          livingPlace: "unknown",
          isDeceased: false,
          maritalStatus: "unknown",
          photoUrl: null,
          relationships: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          familyId,
          occupation: "unknown",
        })
      }
      if (manualRootId) {
        // All rootless become children of manual root
        rootIds = rootless.map(m => {
          const id = crypto.randomUUID();
          nameToId[m.full_name] = id;
          return id;
        })
      } else if (rootless.length === 0 || (members[0].parents && members[0].parents.trim() !== "")) {
        // Year of birth for unknown root: 30 years before first member
        const firstYob = Number(members[0].year_of_birth) || 1970
        const unknownId = crypto.randomUUID()
        unknownRootId = unknownId
        await createFamilyMember({
          id: unknownId,
          name: "unknown",
          fullName: "unknown",
          yearOfBirth: firstYob - 30,
          livingPlace: "unknown",
          isDeceased: false,
          maritalStatus: "unknown",
          photoUrl: null,
          relationships: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          familyId,
          occupation: "unknown",
        })
        // All members with no parent will be children of unknown
        rootIds = rootless.map(m => {
          const id = crypto.randomUUID();
          nameToId[m.full_name] = id;
          return id;
        })
      } else if (rootless.length === 1) {
        // Single root
        rootIds = [crypto.randomUUID()]
        nameToId[rootless[0].full_name] = rootIds[0]
      } else if (allRootlessAreSpouses()) {
        // All rootless are spouses: pick first as root, link rest as spouses
        rootIds = [crypto.randomUUID()]
        nameToId[rootless[0].full_name] = rootIds[0]
        for (let i = 1; i < rootless.length; ++i) {
          nameToId[rootless[i].full_name] = crypto.randomUUID()
        }
      } else {
        // Multiple rootless: create unknown root, make all rootless siblings
        const firstYob = Number(members[0].year_of_birth) || 1970
        const unknownId = crypto.randomUUID()
        unknownRootId = unknownId
        await createFamilyMember({
          id: unknownId,
          name: "unknown",
          fullName: "unknown",
          yearOfBirth: firstYob - 30,
          livingPlace: "unknown",
          isDeceased: false,
          maritalStatus: "unknown",
          photoUrl: null,
          relationships: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          familyId,
          occupation: "unknown",
        })
        rootIds = rootless.map(m => {
          const id = crypto.randomUUID();
          nameToId[m.full_name] = id;
          return id;
        })
      }
      // Insert all members
      for (const m of members) {
        const id = nameToId[m.full_name] || crypto.randomUUID()
        nameToId[m.full_name] = id
        let isDeceased = false
        if (typeof m.is_deceased === 'string') {
          const val = m.is_deceased.trim().toLowerCase()
          isDeceased = val === 'yes' || val === 'true' || val === '1'
        } else if (typeof m.is_deceased === 'number') {
          isDeceased = m.is_deceased === 1
        } else if (typeof m.is_deceased === 'boolean') {
          isDeceased = m.is_deceased
        }
        await createFamilyMember({
          id,
          name: m.full_name,
          fullName: m.full_name,
          yearOfBirth: Number(m.year_of_birth),
          livingPlace: m.living_place,
          isDeceased,
          maritalStatus: m.marital_status,
          photoUrl: m.photo_url || null,
          relationships: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          familyId,
          occupation: m.occupation || '',
        })
      }
      // Insert relationships
      const supabase = createAdminClient()
      for (const m of members) {
        const memberId = nameToId[m.full_name]
        // Parents
        if (m.parents && m.parents.trim() !== "") {
          for (const parentName of m.parents.split(',').map((n: string) => n.trim()).filter(Boolean)) {
            const parentId = nameToId[parentName] || unknownRootId || manualRootId
            if (parentId) {
              await supabase.from('relationships').upsert([
                { member_id: memberId, related_member_id: parentId, type: 'parent' },
                { member_id: parentId, related_member_id: memberId, type: 'child' }
              ], { onConflict: 'member_id,related_member_id,type', ignoreDuplicates: true })
            }
          }
        } else if (unknownRootId || manualRootId) {
          // No parent: link to unknown or manual root
          const rootId = unknownRootId || manualRootId
          await supabase.from('relationships').upsert([
            { member_id: memberId, related_member_id: rootId, type: 'child' },
            { member_id: rootId, related_member_id: memberId, type: 'parent' }
          ], { onConflict: 'member_id,related_member_id,type', ignoreDuplicates: true })
        }
        // Spouses
        if (m.spouses && m.spouses.trim() !== "") {
          for (const spouseName of m.spouses.split(',').map((n: string) => n.trim()).filter(Boolean)) {
            const spouseId = nameToId[spouseName]
            if (spouseId) {
              await supabase.from('relationships').upsert([
                { member_id: memberId, related_member_id: spouseId, type: 'spouse' },
                { member_id: spouseId, related_member_id: memberId, type: 'spouse' }
              ], { onConflict: 'member_id,related_member_id,type', ignoreDuplicates: true })
            }
          }
        }
        // Children
        if (m.children && m.children.trim() !== "") {
          for (const childName of m.children.split(',').map((n: string) => n.trim()).filter(Boolean)) {
            const childId = nameToId[childName]
            if (childId) {
              await supabase.from('relationships').upsert([
                { member_id: memberId, related_member_id: childId, type: 'child' },
                { member_id: childId, related_member_id: memberId, type: 'parent' }
              ], { onConflict: 'member_id,related_member_id,type', ignoreDuplicates: true })
            }
          }
        }
      }
      setImportSuccess("Family and members imported successfully!")
      router.push(`/tree/${familyId}`)
    }
    reader.readAsBinaryString(file)
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
              <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} />
              {importError && <div className="text-sm text-red-500">{importError}</div>}
              {importSuccess && <div className="text-sm text-green-600">{importSuccess}</div>}
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
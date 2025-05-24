"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimerIcon as Timeline, GitBranch, Plus, ZoomIn, ZoomOut, Maximize2, Minimize2, Users, Loader2 } from "lucide-react"
import type { FamilyMember } from "@/lib/types"
import { AddFamilyMemberDialog } from "@/components/add-family-member-dialog"
import { FamilyTreeD3 } from "@/components/family-tree-d3"
import { TimelineChart } from "@/components/timeline-chart"
import { ExportButton } from "@/components/export-button"
import { ShareButton } from "@/components/share-button"
import * as XLSX from "xlsx"
import { createFamilyMember, updateFamilyMember } from "@/lib/actions"
import { createAdminClient } from "@/lib/supabase/admin"
import { toast } from "@/components/ui/use-toast"

interface FamilyTreeViewProps {
  familyMembers: FamilyMember[]
  isAdmin: boolean
  familyId: string
  isMaximizedProp?: boolean
  setIsMaximizedProp?: (v: boolean) => void
  isPublic?: boolean
}

export function FamilyTreeView({ familyMembers, isAdmin, familyId, isMaximizedProp, setIsMaximizedProp, isPublic }: FamilyTreeViewProps) {
  const [view, setView] = useState<"tree" | "timeline">("tree")
  const [zoom, setZoom] = useState(1)
  const isMaximized = !!isMaximizedProp;
  const setIsMaximized = setIsMaximizedProp!;
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isViewLoading, setIsViewLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [isDetectingSiblings, setIsDetectingSiblings] = useState(false)
  // Default required columns match export logic
  const defaultColumns = [
    "full_name",
    "year_of_birth",
    "living_place",
    "is_deceased",
    "marital_status",
    "occupation",
    "parents",
    "spouses",
    "children"
  ]
  // Also allow minimal import format
  const minimalColumns = [
    "full_name",
    "year_of_birth",
    "living_place",
    "is_deceased",
    "marital_status",
    "occupation"
  ]

  const handleViewChange = (newView: "tree" | "timeline") => {
    setIsViewLoading(true)
    setView(newView)
    // Simulate loading time for view change
    setTimeout(() => {
      setIsViewLoading(false)
    }, 500)
  }

  const handleZoomIn = () => {
    setIsLoading(true)
    setZoom((prev) => Math.min(prev + 0.1, 2))
    setTimeout(() => setIsLoading(false), 300)
  }

  const handleZoomOut = () => {
    setIsLoading(true)
    setZoom((prev) => Math.max(prev - 0.1, 0.5))
    setTimeout(() => setIsLoading(false), 300)
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null)
    setImportSuccess(null)
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const data = evt.target?.result
      if (!data) return
      const workbook = XLSX.read(data, { type: "binary" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      const headers = json[0] as string[]
      // Accept if file has all defaultColumns or all minimalColumns
      const hasDefault = defaultColumns.every(col => headers.includes(col))
      const hasMinimal = minimalColumns.every(col => headers.includes(col))
      if (!hasDefault && !hasMinimal) {
        setImportError(
          `Invalid file format.\n\nRequired columns (default): ${defaultColumns.join(", ")}\nOR\nMinimal columns: ${minimalColumns.join(", ")}\n\nYour file columns: ${headers.join(", ")}`
        )
        return
      }
      // Map rows to FamilyMember objects and insert (first pass)
      const rows = json.slice(1)
      let successCount = 0
      let failCount = 0
      const nameToId: Record<string, string> = {}
      const importedMembers: any[] = []
      for (const row of rows as any[]) {
        try {
          const rowArr = row as any[];
          const rowObj = Object.fromEntries(headers.map((h, i) => [h, rowArr[i]]));
          // Robustly extract is_deceased from all common column names
          const deceasedRaw = rowObj.is_deceased ?? rowObj.isDeceased ?? rowObj["Is Deceased"] ?? rowObj["is deceased"];
          const yesValues = ['yes', 'true', '1', 'y', 't'];
          const noValues = ['no', 'false', '0', 'n', 'f'];
          let isDeceased = false;
          if (typeof deceasedRaw === 'boolean') isDeceased = deceasedRaw;
          else if (typeof deceasedRaw === 'number') isDeceased = deceasedRaw === 1;
          else if (typeof deceasedRaw === 'string') {
            const v = deceasedRaw.trim().toLowerCase();
            if (yesValues.includes(v)) isDeceased = true;
            else if (noValues.includes(v)) isDeceased = false;
          }
          // Robustly extract gender from all common column names
          const genderRaw = rowObj.gender ?? rowObj.Gender ?? rowObj.sex ?? rowObj.Sex;
          let gender = 'unknown';
          if (typeof genderRaw === 'string') {
            const g = genderRaw.trim().toLowerCase();
            if (["male", "m"].includes(g)) gender = "male";
            else if (["female", "f"].includes(g)) gender = "female";
            else if (["other", "o"].includes(g)) gender = "other";
            else gender = "unknown";
          }
          // Check if member exists in DB (primary match)
          const supabase = createAdminClient();
          let { data: existing, error: findError } = await supabase
            .from('family_members')
            .select('id')
            .eq('full_name', rowObj.full_name)
            .eq('year_of_birth', Number(rowObj.year_of_birth))
            .eq('living_place', rowObj.living_place)
            .eq('family_id', familyId)
            .maybeSingle();
          let id = existing?.id;
          // If not found, try to match by year_of_birth and relationships
          if (!id) {
            const yearOfBirth = Number(rowObj.year_of_birth);
            const relTypes = ["parents", "spouses", "children"];
            let possibleIds: string[] = [];
            for (const relType of relTypes) {
              const relNames = (typeof rowObj[relType] === 'string') ? rowObj[relType].split(',').map((n: string) => n.trim()).filter(Boolean) : [];
              for (const relName of relNames) {
                // Find related member by name in the same family
                const { data: relatedMembers, error: relError } = await supabase
                  .from('family_members')
                  .select('id')
                  .eq('full_name', relName)
                  .eq('family_id', familyId);
                if (relatedMembers && relatedMembers.length > 0) {
                  for (const related of relatedMembers) {
                    // Find relationships where related_member_id = related.id and year_of_birth matches
                    const { data: rels, error: relsError } = await supabase
                      .from('relationships')
                      .select('member_id')
                      .eq('related_member_id', related.id)
                      .eq('type', relType.slice(0, -1)); // parent/child/spouse
                    if (rels && rels.length > 0) {
                      for (const rel of rels) {
                        // Get the member's year_of_birth
                        const { data: m, error: mErr } = await supabase
                          .from('family_members')
                          .select('id,year_of_birth')
                          .eq('id', rel.member_id)
                          .eq('year_of_birth', yearOfBirth)
                          .maybeSingle();
                        if (m && m.id) possibleIds.push(m.id);
                      }
                    }
                  }
                }
              }
            }
            // If exactly one possible match, use it
            if (possibleIds.length === 1) {
              id = possibleIds[0];
            }
          }
          if (!id) id = crypto.randomUUID();
          const member = {
            id,
            name: rowObj.full_name,
            fullName: rowObj.full_name,
            yearOfBirth: Number(rowObj.year_of_birth),
            livingPlace: rowObj.living_place,
            isDeceased,
            maritalStatus: rowObj.marital_status,
            photoUrl: rowObj.photo_url || null,
            relationships: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            familyId: familyId,
            occupation: rowObj.occupation || '',
            gender: gender as 'male' | 'female' | 'other' | 'unknown', // Fix type error
            generation: rowObj.generation || 0, // Add generation property (default 0)
          };
          if (existing?.id || (id && id !== member.id)) {
            await updateFamilyMember(member);
          } else if (!existing?.id && id === member.id) {
            await createFamilyMember(member);
          }
          nameToId[rowObj.full_name] = id;
          importedMembers.push({ ...member, _rowObj: rowObj });
          successCount++;
        } catch (err) {
          failCount++;
        }
      }
      // Second pass: create relationships
      try {
        const supabase = createAdminClient()
        for (const member of importedMembers) {
          const { _rowObj, id: memberId } = member
          // Helper to parse names from a column
          const parseNames = (val: any) =>
            typeof val === 'string' ? val.split(',').map((n: string) => n.trim()).filter(Boolean) : []
          // Helper to get memberId by name (from import or DB)
          const getMemberIdByName = async (name: string) => {
            if (nameToId[name]) return nameToId[name]
            // Query DB for member with this name in the same family
            const { data, error } = await supabase
              .from('family_members')
              .select('id')
              .eq('full_name', name)
              .eq('family_id', familyId)
              .maybeSingle()
            if (data && data.id) return data.id
            return null
          }
          // Parents
          for (const parentName of parseNames(_rowObj.parents)) {
            const parentId = await getMemberIdByName(parentName)
            if (parentId) {
              await supabase.from('relationships').upsert([
                { member_id: memberId, related_member_id: parentId, type: 'parent' },
                { member_id: parentId, related_member_id: memberId, type: 'child' }
              ], { onConflict: 'member_id,related_member_id,type', ignoreDuplicates: true })
            }
          }
          // Spouses
          for (const spouseName of parseNames(_rowObj.spouses)) {
            const spouseId = await getMemberIdByName(spouseName)
            if (spouseId) {
              await supabase.from('relationships').upsert([
                { member_id: memberId, related_member_id: spouseId, type: 'spouse' },
                { member_id: spouseId, related_member_id: memberId, type: 'spouse' }
              ], { onConflict: 'member_id,related_member_id,type', ignoreDuplicates: true })
            }
          }
          // Children
          for (const childName of parseNames(_rowObj.children)) {
            const childId = await getMemberIdByName(childName)
            if (childId) {
              await supabase.from('relationships').upsert([
                { member_id: memberId, related_member_id: childId, type: 'child' },
                { member_id: childId, related_member_id: memberId, type: 'parent' }
              ], { onConflict: 'member_id,related_member_id,type', ignoreDuplicates: true })
            }
          }
        }
      } catch (relErr) {
        setImportError('Members imported, but failed to import some relationships.')
      }
      if (successCount > 0) {
        setImportSuccess(`Successfully imported ${successCount} member(s).${failCount > 0 ? ` Failed to import ${failCount} row(s).` : ''}`)
      } else {
        setImportError("Failed to import any members. Please check your file format and data.")
      }
    }
    reader.readAsBinaryString(file)
  }

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized); // Fix: pass boolean, not function
  }

  const handleDetectSiblings = async () => {
    try {
      setIsDetectingSiblings(true)
      const response = await fetch('/api/detect-siblings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ familyId }),
      })

      if (!response.ok) {
        throw new Error('Failed to detect siblings')
      }

      toast({
        title: "Success",
        description: "Siblings detected and default parents created",
      })

      // Refresh the page to show the updated tree
      window.location.reload()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to detect siblings",
        variant: "destructive",
      })
    } finally {
      setIsDetectingSiblings(false)
    }
  }

  return (
    <div className={`flex flex-col ${isMaximized ? 'fixed inset-0 z-[30] bg-background' : 'h-[calc(100vh-10rem)]'}`}>
      {/* Unified control bar container - horizontal row with wrapping */}
      <div className="w-full sm:w-auto mb-4 z-40 pointer-events-auto">
        <div className="flex flex-wrap items-center gap-2 w-full">
          {/* Tab switcher always at the start */}
          <Tabs value={view} onValueChange={(v) => handleViewChange(v as 'tree' | 'timeline')} className="w-auto">
            <TabsList className="w-auto">
              <TabsTrigger value="tree" className="flex-1 sm:flex-none" disabled={isViewLoading}>
                <GitBranch className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Tree View</span>
                <span className="sm:hidden">Tree</span>
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex-1 sm:flex-none" disabled={isViewLoading}>
                <Timeline className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Timeline View</span>
                <span className="sm:hidden">Timeline</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {/* All action buttons and zoom controls follow, wrapping as needed */}
          <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ZoomOut className="h-4 w-4" />}
          </Button>
          <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ZoomIn className="h-4 w-4" />}
          </Button>
          <ExportButton familyId={familyId} />
          <ShareButton familyId={familyId} familyName={"Family Tree"} isPublic={isPublic ?? false} />
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowAddDialog(true)} variant="success" className="whitespace-nowrap">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Add Member</span>
                <span className="sm:hidden">Add</span>
              </Button>
              <Button 
                onClick={handleDetectSiblings} 
                disabled={isDetectingSiblings}
                variant="info"
                className="whitespace-nowrap"
              >
                {isDetectingSiblings ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                <span className="hidden sm:inline">Detect Siblings</span>
                <span className="sm:hidden">Detect</span>
              </Button>
              <label htmlFor="import-excel" className="whitespace-nowrap">
                <input
                  id="import-excel"
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={handleImportExcel}
                />
                <Button asChild variant="info">
                  <div>
                    <span className="hidden sm:inline">Import from Excel</span>
                    <span className="sm:hidden">Import</span>
                  </div>
                </Button>
              </label>
            </div>
          )}
        </div>
      </div>
      <div 
        ref={containerRef} 
        className={`flex-1 ${isMaximized ? 'border-0' : 'border rounded-lg'} overflow-hidden tree-canvas relative z-20 ${isMaximized ? 'pointer-events-auto' : ''}`}
        style={{ pointerEvents: isMaximized ? 'auto' : undefined }}
      >
        {isViewLoading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => {
            toggleMaximize();
          }}
          className="absolute top-2 right-2 z-30 bg-background/80 hover:bg-yellow-500 hover:text-white transition-colors"
        >
          {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "0 0",
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
          }}
        >
          {view === "tree" ? (
            familyMembers && familyMembers.length > 0 ? (
              <FamilyTreeD3 data={familyMembers.map(m => ({ ...m, generation: (m as any).generation ?? 0 }))} isAdmin={isAdmin} familyId={familyId} />
            ) : (
              <div className="flex items-center justify-center h-full w-full text-lg text-muted-foreground">No family tree available</div>
            )
          ) : (
            <TimelineChart familyMembers={familyMembers} />
          )}
        </div>
      </div>
    </div>
  )
}

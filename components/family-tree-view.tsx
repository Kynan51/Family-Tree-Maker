"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimerIcon as Timeline, GitBranch, Plus, ZoomIn, ZoomOut } from "lucide-react"
import type { FamilyMember } from "@/lib/types"
import { AddFamilyMemberDialog } from "@/components/add-family-member-dialog"
import { FamilyTreeD3 } from "@/components/family-tree-d3"
import { TimelineChart } from "@/components/timeline-chart"
import { ExportButton } from "@/components/export-button"

interface FamilyTreeViewProps {
  familyMembers: FamilyMember[]
  isAdmin: boolean
  familyId?: string
}

export function FamilyTreeView({ familyMembers, isAdmin, familyId }: FamilyTreeViewProps) {
  console.log("familyMembers prop:", familyMembers);
  const [view, setView] = useState<"tree" | "timeline">("tree")
  const [zoom, setZoom] = useState(1)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5))
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex justify-between mb-4">
        <Tabs value={view} onValueChange={(v) => setView(v as "tree" | "timeline")}>
          <TabsList>
            <TabsTrigger value="tree">
              <GitBranch className="h-4 w-4 mr-2" />
              Tree View
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Timeline className="h-4 w-4 mr-2" />
              Timeline View
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>

          <ExportButton familyId={familyId} />

          {isAdmin && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "0 0",
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
          }}
        >
          {view === "tree" ? (
            <FamilyTreeD3 data={familyMembers.map(m => ({ ...m, name: m.fullName }))} />
          ) : (
            <TimelineChart familyMembers={familyMembers} />
          )}
        </div>
      </div>

      {isAdmin && showAddDialog && (
        <AddFamilyMemberDialog open={showAddDialog} onOpenChange={setShowAddDialog} existingMembers={familyMembers} />
      )}
    </div>
  )
}

"use client"

import React from "react"
import dynamic from "next/dynamic"
import { useMemo, useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import ReactDOM from "react-dom"
import { createFamilyMember } from "@/lib/actions"
import { toast } from "@/components/ui/use-toast"
import { AddFamilyMemberDialog } from "@/components/add-family-member-dialog"
import { Tree, TreeNodeDatum, Point } from 'react-d3-tree'
import { FamilyMember as LibFamilyMember } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { User2 } from "lucide-react"

// Add this interface at the top of the file
interface WindowWithFamilyId extends Window {
  familyId?: string;
  __tree_node_positions__?: Record<string, NodePosition>;
  __tree_members_state__?: FamilyMember[];
}

interface NodePosition {
  x: number;
  y: number;
  raw: any; // This is the actual member data
}

// Tooltip component
function Tooltip({ person }: { person: any }) {
  return (
    <div className="fixed z-50 bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700">
      <div className="text-sm">
        <div className="font-medium text-gray-900 dark:text-white">{person.name}</div>
        <div className="text-gray-500 dark:text-gray-300">{person.relation}</div>
        {person.yearOfBirth && (
          <div className="text-gray-500 dark:text-gray-300">Born: {person.yearOfBirth}</div>
        )}
        {person.livingPlace && (
          <div className="text-gray-500 dark:text-gray-300">Location: {person.livingPlace}</div>
        )}
        {person.occupation && (
          <div className="text-gray-500 dark:text-gray-300">Occupation: {person.occupation}</div>
        )}
        {person.isDeceased && (
          <div className="text-red-500 dark:text-red-400">Deceased</div>
        )}
      </div>
    </div>
  )
}

// Dynamically import react-d3-tree to avoid SSR issues
const TreeComponent = dynamic(() => import("react-d3-tree").then(mod => mod.Tree), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-[500px]">Loading family tree...</div>
})

interface FamilyMember extends LibFamilyMember {
  generation: number
  partner?: FamilyMember
  partners?: FamilyMember[]
  children?: FamilyMember[]
}

interface FamilyTreeD3Props {
  data: FamilyMember[]
  isAdmin: boolean
  familyId: string
}

function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const match = window.matchMedia("(prefers-color-scheme: dark)")
    setIsDark(match.matches)
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    match.addEventListener("change", handler)
    return () => match.removeEventListener("change", handler)
  }, [])
  return isDark
}

function transformToD3Tree(members: FamilyMember[]): any[] {
  return members.map(member => ({
    name: member.name,
    attributes: {
      yearOfBirth: member.yearOfBirth,
      livingPlace: member.livingPlace,
      isDeceased: member.isDeceased ? "Deceased" : "Alive",
      relation: member.maritalStatus || "",
      occupation: member.occupation ?? null,
      partners: (member.partners || []).map((partner: FamilyMember) => ({
        name: partner.name,
        yearOfBirth: partner.yearOfBirth,
        livingPlace: partner.livingPlace,
        isDeceased: partner.isDeceased ? "Deceased" : "Alive",
        relation: partner.maritalStatus || "",
        occupation: partner.occupation ?? null,
      })),
    },
    children: member.children ? transformToD3Tree(member.children) : undefined,
    raw: member,
  }))
}

interface Relationship {
  type: 'parent' | 'spouse' | 'child'
  relatedMemberId: string
}

function buildNestedFamilyTree(flatMembers: FamilyMember[]): FamilyMember[] {
  // Create a map of all members, using the first occurrence of each member
  const memberMap = new Map<string, FamilyMember>()
  const processedRelationships = new Set<string>()
  
  // First pass: create unique member objects
  flatMembers.forEach(m => {
    if (!memberMap.has(m.id)) {
      memberMap.set(m.id, {
        ...m,
        name: m.name,
        children: [],
        partners: []
      })
    }
  })
  
  // Second pass: handle relationships
  flatMembers.forEach(member => {
    if (!member.relationships) return;
    member.relationships.forEach((rel: { type: string; relatedMemberId: string }) => {
      // Create a consistent key for bidirectional relationships
      const [id1, id2] = [member.id, rel.relatedMemberId].sort()
      const relationshipKey = `${id1}-${id2}-${rel.type}`
      
      if (processedRelationships.has(relationshipKey)) {
        return
      }
      
      const relatedMember = memberMap.get(rel.relatedMemberId)
      if (!relatedMember) {
        return
      }
      
      if (rel.type === "parent") {
        // Only add child if it hasn't been processed yet
        if (!memberMap.get(member.id)?.children?.some((c: FamilyMember) => c.id === relatedMember.id)) {
          memberMap.get(member.id)?.children?.push(relatedMember)
          processedRelationships.add(relationshipKey)
        }
      } else if (rel.type === "spouse") {
        // Only add spouse if not already added
        if (!memberMap.get(member.id)?.partners?.some((p: FamilyMember) => p.id === relatedMember.id)) {
          memberMap.get(member.id)?.partners?.push(relatedMember)
          processedRelationships.add(relationshipKey)
        }
      }
    })
  })
  
  // Find root members (those who are not children of any other member)
  const roots = Array.from(memberMap.values()).filter(member => {
    const isChild = Array.from(memberMap.values()).some(m => 
      m.children?.some((c: FamilyMember) => c.id === member.id)
    )
    return !isChild
  })
  
  return roots
}

function CustomNode({ nodeDatum, toggleNode, onAdd, isAdmin }: any) {
  const isDark = useIsDarkMode()
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [tooltipData, setTooltipData] = useState<any>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = (e: React.MouseEvent, data: any) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPosition({
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY - 5
    })
    setTooltipData(data)
    setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
  }

  // Prepare partner cards
  const partners = nodeDatum.attributes.partners || []
  const leftPartners = partners.slice(0, Math.floor(partners.length / 2))
  const rightPartners = partners.slice(Math.floor(partners.length / 2))

  // Main member card
  const mainCard = (
    <div
      ref={cardRef}
      onMouseEnter={e => handleMouseEnter(e, {
        name: nodeDatum.name,
        yearOfBirth: nodeDatum.attributes.yearOfBirth,
        livingPlace: nodeDatum.attributes.livingPlace,
        occupation: nodeDatum.attributes.occupation,
        isDeceased: nodeDatum.attributes.isDeceased,
        relation: nodeDatum.attributes.relation
      })}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}
      data-tooltip={JSON.stringify({
        name: nodeDatum.name,
        yearOfBirth: nodeDatum.attributes.yearOfBirth,
        livingPlace: nodeDatum.attributes.livingPlace,
        occupation: nodeDatum.attributes.occupation,
        isDeceased: nodeDatum.attributes.isDeceased,
        relation: nodeDatum.attributes.relation
      })}
    >
      <Card className="flex flex-col items-center justify-between shadow-sm p-2 rounded-lg w-[160px] h-[140px]">
        <div className="flex flex-col items-center w-full">
          <div className="rounded-full bg-muted w-5 h-5 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2"/></svg>
          </div>
          <span className="font-medium text-center text-sm truncate w-full" title={nodeDatum.name}>{nodeDatum.name}</span>
          <span className="text-xs text-muted-foreground truncate w-full text-center" title={nodeDatum.attributes.relation}>{nodeDatum.attributes.relation}</span>
        </div>
        {isAdmin && (
          <Button variant="success" className="w-full" onClick={(e) => { e.stopPropagation(); onAdd(nodeDatum); }}>
            <User2 className="h-4 w-4 mr-2" />
            Add
          </Button>
        )}
      </Card>
    </div>
  )

  // Partner cards (left)
  const leftPartnerCards = leftPartners.map((partner: any, idx: number) => (
    <div
      key={`partner-left-${idx}`}
      onMouseEnter={e => handleMouseEnter(e, partner)}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'flex', alignItems: 'center' }}
      data-tooltip={JSON.stringify(partner)}
    >
      <Card className="flex flex-col items-center justify-between shadow-sm p-2 rounded-lg w-[160px] h-[140px]">
        <div className="flex flex-col items-center w-full gap-1">
          <div className="rounded-full bg-muted w-5 h-5 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2"/></svg>
          </div>
          <span className="font-medium text-center text-sm truncate w-full" title={partner.name}>{partner.name}</span>
          <span className="text-xs text-muted-foreground truncate w-full text-center" title={partner.relation}>{partner.relation}</span>
        </div>
      </Card>
      <span className="mx-1 text-lg font-bold text-muted-foreground">+</span>
    </div>
  ))

  // Partner cards (right)
  const rightPartnerCards = rightPartners.map((partner: any, idx: number) => (
    <div
      key={`partner-right-${idx}`}
      onMouseEnter={e => handleMouseEnter(e, partner)}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'flex', alignItems: 'center' }}
      data-tooltip={JSON.stringify(partner)}
    >
      <span className="mx-1 text-lg font-bold text-muted-foreground">+</span>
      <Card className="flex flex-col items-center justify-between shadow-sm p-2 rounded-lg w-[160px] h-[140px]">
        <div className="flex flex-col items-center w-full gap-1">
          <div className="rounded-full bg-muted w-5 h-5 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2"/></svg>
          </div>
          <span className="font-medium text-center text-sm truncate w-full" title={partner.name}>{partner.name}</span>
          <span className="text-xs text-muted-foreground truncate w-full text-center" title={partner.relation}>{partner.relation}</span>
        </div>
      </Card>
    </div>
  ))

  // Calculate total width for all cards and plus signs
  const totalCards = leftPartners.length + rightPartners.length + 1;
  const plusSigns = totalCards - 1;
  const cardWidth = 150;
  const plusWidth = 32; // estimate for plus sign and margin
  const totalWidth = totalCards * cardWidth + plusSigns * plusWidth;

  return (
    <g>
      <foreignObject 
        x={-totalWidth / 2} 
        y={-70}
        width={totalWidth + 60} 
        height={140}
      >
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'center', 
          height: '100%', 
          width: '100%', 
          justifyContent: 'center',
          padding: '0 10px'
        }}>
          {leftPartnerCards}
          {mainCard}
          {rightPartnerCards}
        </div>
      </foreignObject>
      {showTooltip && tooltipData && ReactDOM.createPortal(
        <div
          className="fixed z-[9999] bg-card border border-border shadow-lg rounded-lg p-3 text-sm"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateY(-100%)',
            minWidth: '200px',
            maxWidth: '300px',
            pointerEvents: 'none'
          }}
        >
          <div className="font-medium text-card-foreground text-sm">{tooltipData.name}</div>
          <div className="text-muted-foreground text-xs">Born: {tooltipData.yearOfBirth}</div>
          <div className="text-muted-foreground text-xs">Location: {tooltipData.livingPlace}</div>
          {tooltipData.occupation && (
            <div className="text-muted-foreground text-xs">Occupation: {tooltipData.occupation}</div>
          )}
          <div className="text-muted-foreground text-xs">
            Status: {tooltipData.isDeceased === 'Deceased' || tooltipData.isDeceased === true ? <span className="text-red-500">Deceased</span> : tooltipData.isDeceased}
          </div>
          {tooltipData.relation && (
            <div className="text-muted-foreground text-xs">Marital Status: {tooltipData.relation}</div>
          )}
        </div>,
        document.body
      )}
    </g>
  )
}

function normalizeMembers(members: any[]): any[] {
  const normalizedData = members.map(m => {
    const name = m.name ?? m.full_name ?? m.fullName ?? "";
    return {
      ...m,
      name,
      yearOfBirth: m.yearOfBirth ?? m.year_of_birth,
      livingPlace: m.livingPlace ?? m.living_place,
      maritalStatus: m.maritalStatus ?? m.marital_status,
      isDeceased: m.isDeceased ?? m.is_deceased,
      familyId: m.familyId ?? m.family_id,
      occupation: m.occupation,
      relationships: (m.relationships || []).map((r: any) => ({
        ...r,
        relatedMemberId: r.relatedMemberId ?? r.related_member_id,
      })),
    };
  });
  return normalizedData;
}

function SiblingConnectorOverlay({ nodePositions, membersState }: { nodePositions: any, membersState: any[] }) {
  if (!nodePositions) return null
  // Find all parents with more than one child
  const parentToChildren: Record<string, any[]> = {}
  membersState.forEach(member => {
    if (member.relationships) {
      member.relationships.forEach((rel: Relationship) => {
        if (rel.type === 'parent') {
          if (!parentToChildren[rel.relatedMemberId]) parentToChildren[rel.relatedMemberId] = []
          parentToChildren[rel.relatedMemberId].push(member.id)
        }
      })
    }
  })
  // For each parent, draw horizontal line connecting all children, and vertical from parent to first child
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 3 }}>
      {Object.entries(parentToChildren).map(([parentId, childIds]) => {
        if (childIds.length < 2) return null
        // Get positions of all children
        const childNodes = childIds.map(cid => nodePositions[cid]).filter(Boolean)
        if (childNodes.length < 2) return null
        // Sort by x position
        childNodes.sort((a, b) => a.x - b.x)
        // Horizontal line from first to last child
        // y should be just above the cards (y - 45 is top of card, so y - 60 is above)
        const y = childNodes[0].y - 60
        return (
          <g key={parentId}>
            {/* Horizontal line */}
            <line
              x1={childNodes[0].x}
              y1={y}
              x2={childNodes[childNodes.length - 1].x}
              y2={y}
              stroke="#888"
              strokeWidth={2}
            />
            {/* Vertical lines from each child to horizontal */}
            {childNodes.map((c, idx) => (
              <line
                key={c.raw.id}
                x1={c.x}
                y1={y}
                x2={c.x}
                y2={c.y - 45}
                stroke="#888"
                strokeWidth={2}
              />
            ))}
            {/* Vertical from parent to horizontal (to first child) */}
            {nodePositions[parentId] && (
              <line
                x1={nodePositions[parentId].x}
                y1={nodePositions[parentId].y + 45}
                y2={y}
                x2={childNodes[0].x}
                stroke="#888"
                strokeWidth={2}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

interface FormState {
  fullName: string
  yearOfBirth: string
  livingPlace: string
  maritalStatus: string
  occupation: string
  isDeceased: string
}

export function FamilyTreeD3({ data, isAdmin, familyId }: FamilyTreeD3Props) {
  const svgRef = useRef<HTMLDivElement>(null)
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({})

  // Set family ID in window object for export functionality
  useEffect(() => {
    if (familyId) {
      console.log('FamilyTreeD3: Setting familyId in window:', familyId)
      ;(window as WindowWithFamilyId).familyId = familyId
    }
  }, [familyId])

  // Consolidate state for add member functionality
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [form, setForm] = useState<FormState>({
    fullName: '',
    yearOfBirth: '',
    livingPlace: '',
    maritalStatus: 'Single',
    occupation: '',
    isDeceased: 'false',
  })
  
  // Normalize data before using it in state
  const normalizedData = useMemo(() => normalizeMembers(data), [data]);
  const [membersState, setMembersState] = useState(normalizedData)
  const isDark = useIsDarkMode()
  const overlayRef = useRef<HTMLDivElement>(null)

  // Update membersState when data prop changes
  useEffect(() => {
    setMembersState(normalizedData)
  }, [normalizedData])

  const modalRef = useRef<HTMLDivElement>(null)

  // Convert flat data to nested tree
  const nestedData = useMemo(() => buildNestedFamilyTree(membersState), [membersState])
  const treeData = useMemo(() => transformToD3Tree(nestedData), [nestedData])

  // Center the tree horizontally
  const translate = { x: 400, y: 100 }

  // Handler to capture node positions from react-d3-tree
  const handleTreeUpdate = (treeData: any, nodes: any) => {
    if (!Array.isArray(nodes)) return;
    const positions: Record<string, NodePosition> = {}
    nodes.forEach((node: any) => {
      if (node.data && node.data.raw && node.data.raw.id) {
        positions[node.data.raw.id] = { x: node.x, y: node.y, raw: node.data.raw }
      }
    })
    setNodePositions(positions)
    
    // Expose to window for export functionality
    if (typeof window !== 'undefined') {
      (window as any).__tree_node_positions__ = positions;
      (window as any).__tree_members_state__ = membersState;
      // Get family ID from the first member's data
      const familyId = membersState[0]?.familyId;
      if (familyId) {
        console.log('Setting family ID in window:', familyId);
        (window as any).__tree_family_id__ = familyId;
      }
    }
  }

  // Update window object whenever membersState changes
  useEffect(() => {
    if (typeof window !== 'undefined' && nodePositions) {
      (window as any).__tree_node_positions__ = nodePositions;
      (window as any).__tree_members_state__ = membersState;
      // Get family ID from the first member's data
      const familyId = membersState[0]?.familyId;
      if (familyId) {
        console.log('Setting family ID in window:', familyId);
        (window as any).__tree_family_id__ = familyId;
      }
    }
  }, [nodePositions, membersState])

  // Collect all spouse links
  const spouseLinks: {source: string, target: string}[] = []
  membersState.forEach(member => {
    if (member.relationships) {
      member.relationships.forEach((rel: Relationship) => {
        if (rel.type === 'spouse' && member.id < rel.relatedMemberId) {
          spouseLinks.push({ source: member.id, target: rel.relatedMemberId })
        }
      })
    }
  })

  // Overlay for partners and add-member button
  const renderOverlay = () => {
    if (!nodePositions || !svgRef.current) return null
    const svgRect = svgRef.current.getBoundingClientRect()
    return Object.entries(nodePositions).map(([id, pos]) => {
      const main = pos.raw
      const partners = main.partners || []
      if (!partners.length && !isAdmin) return null
      // Calculate screen position
      const left = pos.x + svgRect.left - 75 // 75 = half card width
      const top = pos.y + svgRect.top - 45 // 45 = half card height
      return (
        <div
          key={id}
          style={{ position: 'absolute', left, top, display: 'flex', flexDirection: 'row', alignItems: 'center', pointerEvents: 'none', zIndex: 10 }}
        >
          {/* Left partners */}
          {partners.slice(0, Math.floor(partners.length / 2)).map((partner: any, idx: number) => (
            <div key={`partner-left-${idx}`} style={{ pointerEvents: 'auto', marginRight: 8 }}>
              <Card className="flex flex-col items-center justify-between shadow-sm p-2 rounded-lg w-[160px] h-[140px]">
                <div className="flex flex-col items-center w-full gap-1">
                  <div className="rounded-full bg-muted w-5 h-5 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2"/></svg>
                  </div>
                  <span className="font-medium text-center text-sm truncate w-full" title={partner.name}>{partner.name}</span>
                  <span className="text-xs text-muted-foreground truncate w-full text-center" title={partner.relation}>{partner.relation}</span>
                </div>
              </Card>
              <span className="mx-2 text-lg font-bold text-muted-foreground">+</span>
            </div>
          ))}
          {/* Main card is not rendered here, only in the tree node */}
          {/* Right partners */}
          {partners.slice(Math.floor(partners.length / 2)).map((partner: any, idx: number) => (
            <div key={`partner-right-${idx}`} style={{ pointerEvents: 'auto', marginLeft: 8 }}>
              <span className="mx-2 text-lg font-bold text-muted-foreground">+</span>
              <Card className="flex flex-col items-center justify-between shadow-sm p-2 rounded-lg w-[160px] h-[140px]">
                <div className="flex flex-col items-center w-full gap-1">
                  <div className="rounded-full bg-muted w-5 h-5 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2"/></svg>
                  </div>
                  <span className="font-medium text-center text-sm truncate w-full" title={partner.name}>{partner.name}</span>
                  <span className="text-xs text-muted-foreground truncate w-full text-center" title={partner.relation}>{partner.relation}</span>
                </div>
              </Card>
            </div>
          ))}
          {/* Add member button for admins */}
          {isAdmin && (
            <Button variant="success" className="w-full" style={{ pointerEvents: 'auto', height: 36, alignSelf: 'center' }} onClick={() => { if (main) setSelectedMember(main); setShowAddDialog(true); }}>
              <User2 className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          )}
        </div>
      )
    })
  }

  // Handler for add member button clicks
  const handleAddMemberClick = (node: any) => {
    setSelectedMember(node.raw) // Use node.raw to get the actual member data
    setShowAddDialog(true)
  }

  // Handler for adding a new member
  const handleAddMember = async (newMember: FamilyMember) => {
    try {
      if (!selectedMember) return;

      // Create the new member with relationship to the selected node
      const memberToAdd: LibFamilyMember = {
        id: newMember.id,
        name: newMember.name,
        yearOfBirth: newMember.yearOfBirth,
        livingPlace: newMember.livingPlace,
        isDeceased: newMember.isDeceased,
        maritalStatus: newMember.maritalStatus || 'Single',
        familyId: selectedMember.familyId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        relationships: [
          {
            type: 'child' as const,
            relatedMemberId: selectedMember.id
          }
        ]
      }

      // Save to database
      const createdMember = await createFamilyMember(memberToAdd)

      // Update local state with the created member
      const memberWithGeneration: FamilyMember = {
        ...createdMember,
        generation: selectedMember.generation + 1,
        partner: undefined,
        partners: [],
        children: []
      }
      setMembersState(prev => [...prev, memberWithGeneration])

      // Close dialog and clean up
      setShowAddDialog(false)
      setSelectedMember(null)

      // Show success message
      toast({
        title: "Success",
        description: "Family member added successfully",
      })
    } catch (error) {
      console.error('Error adding family member:', error)
      toast({
        title: "Error",
        description: "Failed to add family member",
        variant: "destructive",
      })
    }
  }

  if (!treeData || (Array.isArray(treeData) && treeData.length === 0)) {
    return <div className="text-center text-gray-500 py-10">No family members to display yet.</div>;
  }

  // If there are no members, show a root-member form
  if (!membersState || membersState.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px]">
        <div className="bg-background rounded-lg shadow-lg p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center text-foreground">Start Your Family Tree</h2>
          <p className="mb-6 text-center text-muted-foreground">Add the first (oldest) person to begin your family tree.</p>
          <form onSubmit={e => {
            e.preventDefault();
            const newId = Math.random().toString(36).slice(2)
            const newMember = {
              id: newId,
              fullName: form.fullName,
              yearOfBirth: parseInt(form.yearOfBirth),
              livingPlace: form.livingPlace,
              isDeceased: form.isDeceased === 'true',
              maritalStatus: form.maritalStatus,
              occupation: form.occupation,
              relationships: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              familyId: '', // can be set if needed
            }
            setMembersState([newMember])
            setForm({
              fullName: '',
              yearOfBirth: '',
              livingPlace: '',
              maritalStatus: 'Single',
              occupation: '',
              isDeceased: 'false',
            })
          }}>
            <div className="mb-3">
              <label className="block mb-1 font-medium text-foreground">Full Name</label>
              <input 
                name="fullName" 
                required 
                className="w-full border rounded px-3 py-2 bg-background text-foreground border-input focus:outline-none focus:ring-2 focus:ring-ring" 
                value={form.fullName} 
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} 
              />
            </div>
            <div className="mb-3">
              <label className="block mb-1 font-medium text-foreground">Year of Birth</label>
              <input 
                name="yearOfBirth" 
                type="number" 
                required 
                className="w-full border rounded px-3 py-2 bg-background text-foreground border-input focus:outline-none focus:ring-2 focus:ring-ring" 
                value={form.yearOfBirth} 
                onChange={e => setForm(f => ({ ...f, yearOfBirth: e.target.value }))} 
              />
            </div>
            <div className="mb-3">
              <label className="block mb-1 font-medium text-foreground">Living Place</label>
              <input 
                name="livingPlace" 
                required 
                className="w-full border rounded px-3 py-2 bg-background text-foreground border-input focus:outline-none focus:ring-2 focus:ring-ring" 
                value={form.livingPlace} 
                onChange={e => setForm(f => ({ ...f, livingPlace: e.target.value }))} 
              />
            </div>
            <div className="mb-3">
              <label className="block mb-1 font-medium text-foreground">Marital Status</label>
              <select 
                name="maritalStatus" 
                required 
                className="w-full border rounded px-3 py-2 bg-background text-foreground border-input focus:outline-none focus:ring-2 focus:ring-ring" 
                value={form.maritalStatus} 
                onChange={e => setForm(f => ({ ...f, maritalStatus: e.target.value }))}
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="block mb-1 font-medium text-foreground">Occupation</label>
              <input 
                name="occupation" 
                className="w-full border rounded px-3 py-2 bg-background text-foreground border-input focus:outline-none focus:ring-2 focus:ring-ring" 
                value={form.occupation} 
                onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} 
              />
            </div>
            <div className="mb-3">
              <label className="block mb-1 font-medium text-foreground">Deceased?</label>
              <select 
                name="isDeceased" 
                required 
                className="w-full border rounded px-3 py-2 bg-background text-foreground border-input focus:outline-none focus:ring-2 focus:ring-ring" 
                value={form.isDeceased} 
                onChange={e => setForm(f => ({ ...f, isDeceased: e.target.value }))}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground py-2 rounded hover:bg-primary/90 font-semibold transition-colors"
            >
              Add First Member
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full" ref={svgRef}>
      <TreeComponent
        data={treeData}
        translate={translate}
        orientation="vertical"
        renderCustomNodeElement={(rd3tProps) => (
          <CustomNode
            {...rd3tProps}
            isAdmin={isAdmin}
            onAdd={handleAddMemberClick}
          />
        )}
        pathFunc={(linkData) => {
          const { source, target } = linkData;
          
          // Calculate connection points from the center of cards
          const sourceX = source.x;
          const sourceY = source.y + 70; // Bottom of parent card
          const targetX = target.x;
          const targetY = target.y - 70; // Top of child card
          
          // Calculate control points for the curve
          const midY = sourceY + (targetY - sourceY) / 2;
          
          // Create a smooth curved path using cubic bezier
          return `
            M ${sourceX} ${sourceY}
            C ${sourceX} ${sourceY + 20},
              ${sourceX} ${midY - 20},
              ${sourceX} ${midY}
            L ${targetX} ${midY}
            C ${targetX} ${midY + 20},
              ${targetX} ${targetY - 20},
              ${targetX} ${targetY}
          `.trim();
        }}
        zoomable={true}
        collapsible={false}
        nodeSize={{ x: 220, y: 200 }}
        separation={{ siblings: 1.5, nonSiblings: 2 }}
        enableLegacyTransitions={true}
        pathClassFunc={() => isDark ? "link-dark" : "link-light"}
        onUpdate={(target: { node: TreeNodeDatum | null; zoom: number; translate: Point }) => {
          if (target.node) {
            handleTreeUpdate(treeData, [target.node])
          }
        }}
      />
      <style jsx global>{`
        .link-dark {
          stroke: #bbb;
          stroke-width: 2;
        }
        .link-light {
          stroke: #888;
          stroke-width: 2;
        }
      `}</style>
      <div ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
        {renderOverlay()}
      </div>

      {/* Add Member Dialog */}
      {showAddDialog && selectedMember && (
        <AddFamilyMemberDialog
          open={showAddDialog}
          onOpenChange={(open) => {
            setShowAddDialog(open)
            if (!open) setSelectedMember(null)
          }}
          existingMembers={membersState}
          onAdd={(member: LibFamilyMember) => {
            const memberWithGeneration: FamilyMember = {
              ...member,
              generation: selectedMember.generation + 1,
              partner: undefined,
              partners: [],
              children: []
            };
            handleAddMember(memberWithGeneration);
          }}
          source="card"
          selectedMember={selectedMember}
          familyId={selectedMember.familyId}
        />
      )}
    </div>
  )
} 
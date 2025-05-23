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
        {person.gender && (
          <div className="text-gray-500 dark:text-gray-300">Gender: {person.gender.charAt(0).toUpperCase() + person.gender.slice(1)}</div>
        )}
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
  // Map of all members by ID
  const memberMap = new Map<string, FamilyMember>()
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

  // Build parent relationships
  const childToParents: Record<string, string[]> = {}
  flatMembers.forEach(member => {
    if (!member.relationships) return
    member.relationships.forEach((rel: { type: string; relatedMemberId: string }) => {
      if (rel.type === 'parent') {
        if (!childToParents[member.id]) childToParents[member.id] = []
        childToParents[member.id].push(rel.relatedMemberId)
      }
    })
  })

  // Track which members have been attached as children (to avoid duplicates)
  const attachedAsChild = new Set<string>()

  // Attach children to parents, but only once per child
  flatMembers.forEach(member => {
    if (!member.relationships) return
    member.relationships.forEach((rel: { type: string; relatedMemberId: string }) => {
      if (rel.type === 'parent') {
        const parent = memberMap.get(rel.relatedMemberId)
        const child = memberMap.get(member.id)
        if (parent && child && !attachedAsChild.has(child.id)) {
          parent.children = parent.children || []
          if (!parent.children.some(c => c.id === child.id)) {
            parent.children.push(child)
            attachedAsChild.add(child.id)
          }
        }
      } else if (rel.type === 'spouse') {
        const spouse = memberMap.get(rel.relatedMemberId)
        if (spouse && member.id !== spouse.id) {
          const partners = memberMap.get(member.id)?.partners || []
          if (!partners.some(p => p.id === spouse.id)) {
            memberMap.get(member.id)!.partners!.push(spouse)
          }
        }
      }
    })
  })

  // Roots: members who are not attached as a child to any parent
  const roots = Array.from(memberMap.values()).filter(member => !attachedAsChild.has(member.id))
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
        relation: nodeDatum.attributes.relation,
        gender: nodeDatum.raw?.gender || 'unknown',
      })}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}
      data-tooltip={JSON.stringify({
        name: nodeDatum.name,
        yearOfBirth: nodeDatum.attributes.yearOfBirth,
        livingPlace: nodeDatum.attributes.livingPlace,
        occupation: nodeDatum.attributes.occupation,
        isDeceased: nodeDatum.attributes.isDeceased,
        relation: nodeDatum.attributes.relation,
        gender: nodeDatum.raw?.gender || 'unknown',
      })}
    >
      <Card className="flex flex-col items-center justify-between shadow-sm p-2 rounded-lg w-[160px] h-[140px]">
        <div className="flex flex-col items-center w-full">
          <div className="rounded-full bg-muted w-5 h-5 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2"/></svg>
          </div>
          <span className="font-medium text-center text-sm truncate w-full" title={nodeDatum.name}>{nodeDatum.name}</span>
          <span className="text-xs text-muted-foreground truncate w-full text-center" title={nodeDatum.raw?.gender || 'unknown'}>
            {nodeDatum.raw?.gender?.charAt(0).toUpperCase() + nodeDatum.raw?.gender?.slice(1) || 'Unknown'}
          </span>
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
      onMouseEnter={e => handleMouseEnter(e, {
        name: partner.name,
        yearOfBirth: partner.yearOfBirth,
        yearOfDeath: partner.yearOfDeath,
        livingPlace: partner.livingPlace,
        occupation: partner.occupation,
        isDeceased: partner.isDeceased,
        relation: partner.relation,
        gender: partner.gender ? partner.gender : 'unknown',
      })}
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
          <span className="text-xs text-muted-foreground truncate w-full text-center" title={partner.gender || 'unknown'}>
            {partner.gender?.charAt(0).toUpperCase() + partner.gender?.slice(1) || 'Unknown'}
          </span>
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
      onMouseEnter={e => handleMouseEnter(e, {
        name: partner.name,
        yearOfBirth: partner.yearOfBirth,
        yearOfDeath: partner.yearOfDeath,
        livingPlace: partner.livingPlace,
        occupation: partner.occupation,
        isDeceased: partner.isDeceased,
        relation: partner.relation,
        gender: partner.gender ? partner.gender : 'unknown',
      })}
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
          <span className="text-xs text-muted-foreground truncate w-full text-center" title={partner.gender || 'unknown'}>
            {partner.gender?.charAt(0).toUpperCase() + partner.gender?.slice(1) || 'Unknown'}
          </span>
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

  // Adjust the z-index of the tooltip to ensure it is below the dialog
  const tooltipZIndex = 90; // Further reduce the z-index to ensure it is below the dialog

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
          className="fixed bg-card border border-border shadow-lg rounded-lg p-3 text-sm"
          style={{
            zIndex: tooltipZIndex, // Apply the adjusted z-index
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
          {tooltipData.gender && (
            <div className="text-muted-foreground text-xs">Gender: {tooltipData.gender.charAt(0).toUpperCase() + tooltipData.gender.slice(1)}</div>
          )}
          {tooltipData.yearOfDeath && (
            <div className="text-muted-foreground text-xs">Died: {tooltipData.yearOfDeath}</div>
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
      (window as any).__family_id__ = familyId;
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

  // Calculate max node width for current tree
  const maxNodeWidth = useMemo(() => getMaxNodeWidth(nestedData), [nestedData])

  // Center the tree horizontally based on container width
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    function updateWidth() {
      if (svgRef.current) {
        setContainerWidth(svgRef.current.offsetWidth)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Calculate translate.x to center the root
  const translate = useMemo(() => ({
    x: Math.max(containerWidth / 2, maxNodeWidth / 2),
    y: 100
  }), [containerWidth, maxNodeWidth])

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
                  <span className="text-xs text-muted-foreground truncate w-full text-center" title={partner.gender || 'unknown'}>
                    {partner.gender?.charAt(0).toUpperCase() + partner.gender?.slice(1) || 'Unknown'}
                  </span>
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
        gender: newMember.gender,
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
      toast({
        title: "Error",
        description: "Failed to add family member",
        variant: "destructive",
      })
    }
  }

  // Utility to calculate the required width for a node based on partners
  function getNodeWidth(node: any) {
    const partners = node.partners?.length || 0;
    const totalCards = partners + 1;
    const plusSigns = Math.max(0, totalCards - 1);
    const cardWidth = 160;
    const plusWidth = 32;
    const width = totalCards * cardWidth + plusSigns * plusWidth;
    return Math.max(200, Math.min(width, 600));
  }

  // Utility to get the max node width in the tree
  function getMaxNodeWidth(members: any[]): number {
    let maxWidth = 200;
    function traverse(nodes: any[]) {
      nodes.forEach(node => {
        const width = getNodeWidth(node);
        if (width > maxWidth) maxWidth = width;
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      });
    }
    traverse(members);
    return maxWidth;
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
            const newId = Math.random().toString(36).slice(2);
            const newMember = {
              id: newId,
              fullName: form.fullName,
              yearOfBirth: parseInt(form.yearOfBirth),
              livingPlace: form.livingPlace,
              isDeceased: form.isDeceased === 'true',
              maritalStatus: form.maritalStatus,
              occupation: form.occupation,
              gender: 'unknown',
              relationships: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              familyId: '', // can be set if needed
            };
            setMembersState([newMember]);
            setForm({
              fullName: '',
              yearOfBirth: '',
              livingPlace: '',
              maritalStatus: 'Single',
              occupation: '',
              isDeceased: 'false',
            });
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
    <div className="relative">
      <div ref={svgRef} className="relative w-full h-full min-h-[600px]">
        <TreeComponent
          data={treeData}
          translate={translate}
          orientation="vertical"
          pathFunc="step"
          collapsible={false}
          zoomable={true}
          scaleExtent={{ min: 0.1, max: 2 }}
          nodeSize={{ x: maxNodeWidth, y: 200 }}
          separation={{ siblings: 1, nonSiblings: 1 }}
          renderCustomNodeElement={(rd3tProps) => (
            <CustomNode
              {...rd3tProps}
              onAdd={handleAddMemberClick}
              isAdmin={isAdmin}
            />
          )}
        />
      </div>
      <SiblingConnectorOverlay nodePositions={nodePositions} membersState={membersState} />
      {renderOverlay()}
      {showAddDialog && (
        <AddFamilyMemberDialog
          open={showAddDialog}
          onOpenChange={(open) => setShowAddDialog(open)}
          onAdd={(member) => {
            // Remove generation property if present
            const { generation, ...rest } = member as any;
            // Call async handler, but don't await (AddFamilyMemberDialog expects sync)
            void handleAddMember(rest as FamilyMember);
          }}
          existingMembers={membersState}
          selectedMember={selectedMember ?? undefined}
          familyId={familyId}
          isAdmin={isAdmin}
          source="card"
        />
      )}
    </div>
  )
}
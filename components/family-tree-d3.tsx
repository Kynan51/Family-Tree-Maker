"use client"

import React from "react"
import dynamic from "next/dynamic"
import { useMemo, useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import ReactDOM from "react-dom"
import { createFamilyMember } from "@/lib/actions"
import { toast } from "@/components/ui/use-toast"
import { AddFamilyMemberDialog } from "@/components/add-family-member-dialog"

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
const Tree = dynamic(() => import("react-d3-tree").then(mod => mod.Tree), { ssr: false })

interface FamilyMember {
  id: string
  name: string
  yearOfBirth: number
  livingPlace: string
  generation: number
  isDeceased: boolean
  relation?: string
  partner?: FamilyMember
  children?: FamilyMember[]
  occupation?: string
  fullName?: string
}

interface FamilyTreeD3Props {
  data: FamilyMember[]
}

// Hook to detect dark mode
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

// Transform your data to the format react-d3-tree expects
function transformToD3Tree(members: FamilyMember[]): any[] {
  return members.map(member => ({
    name: member.name,
    attributes: {
      yearOfBirth: member.yearOfBirth,
      livingPlace: member.livingPlace,
      isDeceased: member.isDeceased ? "Deceased" : "Alive",
      relation: member.maritalStatus || "",
      occupation: member.occupation ?? null,
      partners: (member.partners || []).map(partner => ({
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

// Utility: Convert flat FamilyMember[] with relationships to nested structure
function buildNestedFamilyTree(flatMembers: any[]): any[] {
  console.log('=== Starting Tree Build ===')
  console.log('Input members:', flatMembers.map(m => ({ id: m.id, name: m.name, relationships: m.relationships })))

  // Create a map of all members, using the first occurrence of each member
  const memberMap = new Map()
  const processedRelationships = new Set()
  
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
  
  console.log('Initial member map:', Array.from(memberMap.entries()).map(([id, m]) => ({ id, name: m.name })))
  
  // Second pass: handle relationships
  flatMembers.forEach(member => {
    console.log(`\nProcessing member: ${member.name} (${member.id})`)
    
    if (!member.relationships) {
      console.log('No relationships found for member')
      return
    }
    
    const currentMember = memberMap.get(member.id)
    if (!currentMember) {
      console.log('Member not found in map')
      return
    }
    
    member.relationships.forEach(rel => {
      // Create a consistent key for bidirectional relationships
      const [id1, id2] = [member.id, rel.relatedMemberId].sort()
      const relationshipKey = `${id1}-${id2}-${rel.type}`
      
      if (processedRelationships.has(relationshipKey)) {
        console.log(`Relationship already processed: ${relationshipKey}`)
        return
      }
      
      console.log(`\nProcessing relationship:`, rel)
      const relatedMember = memberMap.get(rel.relatedMemberId)
      if (!relatedMember) {
        console.log('Related member not found in map')
        return
      }
      
      if (rel.type === "parent") {
        console.log(`Parent relationship found: ${member.name} -> ${relatedMember.name}`)
        // Only add child if it hasn't been processed yet
        if (!currentMember.children.some(c => c.id === relatedMember.id)) {
          console.log(`Adding child: ${relatedMember.name} to ${member.name}`)
          currentMember.children.push(relatedMember)
          processedRelationships.add(relationshipKey)
        } else {
          console.log(`Child ${relatedMember.name} already added, skipping`)
          processedRelationships.add(relationshipKey)
        }
      } else if (rel.type === "spouse") {
        console.log(`Spouse relationship found: ${member.name} <-> ${relatedMember.name}`)
        // Only add spouse if not already added
        if (!currentMember.partners.some(p => p.id === relatedMember.id)) {
          console.log(`Adding spouse: ${relatedMember.name} to ${member.name}`)
          currentMember.partners.push(relatedMember)
          processedRelationships.add(relationshipKey)
        } else {
          console.log(`Spouse ${relatedMember.name} already added, skipping`)
          processedRelationships.add(relationshipKey)
        }
      }
    })
  })
  
  // Find root members (those who are not children of any other member)
  const roots = Array.from(memberMap.values()).filter(member => {
    const isChild = Array.from(memberMap.values()).some(m => 
      m.children.some(c => c.id === member.id)
    )
    return !isChild
  })
  
  console.log('\n=== Final Tree Structure ===')
  console.log('Processed relationships:', Array.from(processedRelationships))
  console.log('Root members:', roots.map(r => ({ id: r.id, name: r.name })))
  
  // Log the complete tree structure
  function logTree(member: any, depth = 0) {
    const indent = '  '.repeat(depth)
    console.log(`${indent}${member.name} (${member.id})`)
    if (member.partners.length > 0) {
      console.log(`${indent}  Partners: ${member.partners.map(p => p.name).join(', ')}`)
    }
    if (member.children.length > 0) {
      console.log(`${indent}  Children:`)
      member.children.forEach(child => logTree(child, depth + 2))
    }
  }
  
  console.log('\n=== Complete Tree Structure ===')
  roots.forEach(root => logTree(root))
  
  return roots
}

// Restore previous node rendering with partners, tooltips, and add-member button
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
          <button
            className="w-full px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded flex items-center justify-center gap-1 shadow transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onAdd(nodeDatum)
            }}
          >
            <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </button>
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
          className="fixed z-50 bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 text-sm"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateY(-100%)',
            minWidth: '200px',
            maxWidth: '300px'
          }}
        >
          <div className="font-medium text-gray-900 dark:text-white">{tooltipData.name}</div>
          <div className="text-gray-500 dark:text-gray-300">Born: {tooltipData.yearOfBirth}</div>
          <div className="text-gray-500 dark:text-gray-300">Location: {tooltipData.livingPlace}</div>
          {tooltipData.occupation && (
            <div className="text-gray-500 dark:text-gray-300">Occupation: {tooltipData.occupation}</div>
          )}
          <div className="text-gray-500 dark:text-gray-300">Status: {tooltipData.isDeceased}</div>
          {tooltipData.relation && (
            <div className="text-gray-500 dark:text-gray-300">Marital Status: {tooltipData.relation}</div>
          )}
        </div>,
        document.body
      )}
    </g>
  )
}

// Normalization function to map backend fields to frontend fields
function normalizeMembers(members: any[]): any[] {
  const normalizedData = members.map(m => {
    const name = m.name ?? m.full_name ?? "";
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

// Add custom SVG overlay for sibling connectors
function SiblingConnectorOverlay({ nodePositions, membersState }: { nodePositions: any, membersState: any[] }) {
  if (!nodePositions) return null
  // Find all parents with more than one child
  const parentToChildren: Record<string, any[]> = {}
  membersState.forEach(member => {
    if (member.relationships) {
      member.relationships.forEach(rel => {
        if (rel.type === 'parent') {
          if (!parentToChildren[rel.related_member_id]) parentToChildren[rel.related_member_id] = []
          parentToChildren[rel.related_member_id].push(member.id)
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
                x2={childNodes[0].x}
                y2={y}
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

export function FamilyTreeD3({ data, isAdmin = false }: FamilyTreeD3Props & { isAdmin?: boolean }) {
  console.log('FamilyTreeD3: isAdmin =', isAdmin);
  console.log("FamilyTreeD3 data:", data);
  // Debug log in browser for each member
  useEffect(() => {
    console.log("🌳 [Browser] FamilyTreeD3 data:", data);
    data.forEach(m => {
      console.log(`🌳 Member: ${m.name} | id: ${m.id} | relationships:`, m.relationships);
    });
  }, [data]);
  // Consolidate state for add member functionality
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  
  // Normalize data before using it in state
  const normalizedData = useMemo(() => normalizeMembers(data), [data]);
  const [membersState, setMembersState] = useState(normalizedData)
  const isDark = useIsDarkMode()
  const [nodePositions, setNodePositions] = useState<{[id: string]: {x: number, y: number, raw: any}} | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<HTMLDivElement>(null)

  // Update membersState when data prop changes
  useEffect(() => {
    setMembersState(normalizedData)
  }, [normalizedData])

  const modalRef = useRef<HTMLDivElement>(null)

  // Convert flat data to nested tree
  const nestedData = useMemo(() => buildNestedFamilyTree(membersState), [membersState])
  console.log("nestedData:", nestedData);
  const treeData = useMemo(() => transformToD3Tree(nestedData), [nestedData])
  console.log("treeData:", treeData);

  // Center the tree horizontally
  const translate = { x: 400, y: 100 }

  // Handler to capture node positions from react-d3-tree
  const handleTreeUpdate = (treeData: any, nodes: any) => {
    if (!Array.isArray(nodes)) return;
    const positions: {[id: string]: {x: number, y: number, raw: any}} = {}
    nodes.forEach((node: any) => {
      if (node.data && node.data.raw && node.data.raw.id) {
        positions[node.data.raw.id] = { x: node.x, y: node.y, raw: node.data.raw }
      }
    })
    setNodePositions(positions)
  }

  // Collect all spouse links
  const spouseLinks: {source: string, target: string}[] = []
  membersState.forEach(member => {
    if (member.relationships) {
      member.relationships.forEach(rel => {
        if (rel.type === 'spouse' && member.id < rel.related_member_id) {
          spouseLinks.push({ source: member.id, target: rel.related_member_id })
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
            <button
              className="ml-2 px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded flex items-center gap-1 shadow"
              style={{ pointerEvents: 'auto', height: 36, alignSelf: 'center' }}
              onClick={() => { if (main) setSelectedNode(main); setShowAddDialog(true); }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Member
            </button>
          )}
        </div>
      )
    })
  }

  // Handler for add member button clicks
  const handleAddMemberClick = (node: any) => {
    setSelectedNode(node.raw) // Use node.raw to get the actual member data
    setShowAddDialog(true)
  }

  // Handler for adding a new member
  const handleAddMember = async (newMember: FamilyMember) => {
    try {
      if (!selectedNode) return;

      // Create the new member with relationship to the selected node
      const memberToAdd = {
        ...newMember,
        familyId: selectedNode.familyId, // Ensure familyId is passed
        relationships: [
          {
            type: 'child',
            relatedMemberId: selectedNode.id
          }
        ]
      }

      // Save to database
      const createdMember = await createFamilyMember(memberToAdd)

      // Update local state with the created member
      setMembersState(prev => [...prev, createdMember])

      // Close dialog and clean up
      setShowAddDialog(false)
      setSelectedNode(null)

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
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center">Start Your Family Tree</h2>
          <p className="mb-6 text-center text-gray-600 dark:text-gray-300">Add the first (oldest) person to begin your family tree.</p>
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
              <label className="block mb-1 font-medium">Full Name</label>
              <input name="fullName" required className="w-full border rounded px-3 py-2" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="mb-3">
              <label className="block mb-1 font-medium">Year of Birth</label>
              <input name="yearOfBirth" type="number" required className="w-full border rounded px-3 py-2" value={form.yearOfBirth} onChange={e => setForm(f => ({ ...f, yearOfBirth: e.target.value }))} />
            </div>
            <div className="mb-3">
              <label className="block mb-1 font-medium">Living Place</label>
              <input name="livingPlace" required className="w-full border rounded px-3 py-2" value={form.livingPlace} onChange={e => setForm(f => ({ ...f, livingPlace: e.target.value }))} />
            </div>
            <div className="mb-3">
              <label className="block mb-1 font-medium">Marital Status</label>
              <select name="maritalStatus" required className="w-full border rounded px-3 py-2" value={form.maritalStatus} onChange={e => setForm(f => ({ ...f, maritalStatus: e.target.value }))}>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="block mb-1 font-medium">Occupation</label>
              <input name="occupation" className="w-full border rounded px-3 py-2" value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} />
            </div>
            <div className="mb-3">
              <label className="block mb-1 font-medium">Deceased?</label>
              <select name="isDeceased" required className="w-full border rounded px-3 py-2" value={form.isDeceased} onChange={e => setForm(f => ({ ...f, isDeceased: e.target.value }))}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-green-700 text-white py-2 rounded hover:bg-green-800 font-semibold">Add First Member</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full" ref={svgRef}>
      <Tree
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
          
          // Precise measurements for card connections
          const sourceX = source.x;
          const sourceY = source.y + 70;  // Bottom center of parent card
          const targetX = target.x;
          const targetY = target.y - 70;  // Top center of child card
          
          // Calculate the middle point exactly halfway between parent and child
          const midY = sourceY + (targetY - sourceY) / 2;
          
          // Create a clean path with three segments:
          // 1. Straight down from parent
          // 2. Horizontal connection
          // 3. Straight up to child
          return `
            M ${sourceX} ${sourceY}
            L ${sourceX} ${midY}
            L ${targetX} ${midY}
            L ${targetX} ${targetY}
          `.trim().replace(/\s+/g, ' ');
        }}
        zoomable={true}
        collapsible={false}
        nodeSize={{ x: 220, y: 200 }}
        separation={{ siblings: 1.5, nonSiblings: 2 }}
        enableLegacyTransitions={true}
        styles={{
          links: {
            stroke: isDark ? "#bbb" : "#888",
            strokeWidth: 2,
          },
        }}
        onUpdate={handleTreeUpdate}
      />
      <div ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
        {renderOverlay()}
      </div>

      {/* Add Member Dialog */}
      {showAddDialog && selectedNode && (
        <AddFamilyMemberDialog
          open={showAddDialog}
          onOpenChange={(open) => {
            setShowAddDialog(open)
            if (!open) setSelectedNode(null)
          }}
          existingMembers={membersState}
          onAdd={handleAddMember}
          source="card"
          selectedMember={selectedNode}
          familyId={selectedNode.familyId}
        />
      )}
    </div>
  )
} 
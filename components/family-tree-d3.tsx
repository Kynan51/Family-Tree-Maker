"use client"

import dynamic from "next/dynamic"
import { useMemo, useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import ReactDOM from "react-dom"

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
      relation: member.relation || "",
      occupation: member.occupation ?? null,
      partner: member.partner ? {
        name: member.partner.name,
        yearOfBirth: member.partner.yearOfBirth,
        livingPlace: member.partner.livingPlace,
        isDeceased: member.partner.isDeceased ? "Deceased" : "Alive",
        relation: member.partner.relation || "",
        occupation: member.partner.occupation ?? null,
      } : null,
    },
    children: member.children ? transformToD3Tree(member.children) : undefined,
    raw: member,
  }))
}

// Utility: Convert flat FamilyMember[] with relationships to nested structure
function buildNestedFamilyTree(flatMembers: any[]): any[] {
  const idToMember: Record<string, any> = {}
  flatMembers.forEach(m => {
    idToMember[m.id] = {
      ...m,
      name: m.name || m.fullName,
      children: [],
      partner: undefined
    }
  })

  // Assign children and partner
  flatMembers.forEach(m => {
    // Children: find all members who list this member as a parent
    idToMember[m.id].children = flatMembers.filter(childCandidate =>
      (childCandidate.relationships || []).some(r => r.type === "child" && r.relatedMemberId === m.id)
    ).map(child => idToMember[child.id])

    // Partner
    if (m.relationships) {
      const spouseRel = m.relationships.find(rel => rel.type === "spouse" && idToMember[rel.relatedMemberId])
      if (spouseRel) {
        idToMember[m.id].partner = idToMember[spouseRel.relatedMemberId]
      }
    }
  })

  // Roots: members who do not have any 'child' relationships (i.e., no parents)
  const roots = flatMembers.filter(m => !m.relationships || !m.relationships.some(r => r.type === "child")).map(m => idToMember[m.id])
  return roots
}

function CustomNode({ nodeDatum, toggleNode, onAdd }: any) {
  const [hoveredPerson, setHoveredPerson] = useState<null | "self" | "partner">(null)
  const partner = nodeDatum.attributes.partner
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null)
  const selfCardRef = useState<HTMLDivElement | null>(null)
  const partnerCardRef = useState<HTMLDivElement | null>(null)

  // Helper to show tooltip above the card
  const showTooltip = (who: "self" | "partner") => {
    setHoveredPerson(who)
    const ref = who === "self" ? selfCardRef[0] : partnerCardRef[0]
    if (ref) {
      const rect = ref.getBoundingClientRect()
      setTooltipPos({
        left: rect.left + rect.width / 2,
        top: rect.top - 12, // 12px above the card
      })
    }
  }
  const hideTooltip = () => {
    setHoveredPerson(null)
    setTooltipPos(null)
  }

  // Tooltip content for a person
  const Tooltip = ({ person }: { person: any }) => {
    const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    return (
      <div style={{
        position: "fixed",
        left: (tooltipPos?.left ?? 0),
        top: (tooltipPos?.top ?? 0) - 3 - 60, // 3px above the card top, assuming tooltip height ~60px
        transform: "translateX(-50%)",
        zIndex: 9999,
        pointerEvents: "none",
        background: isDark ? "#23272e" : "#fff",
        color: isDark ? "#fff" : "#222",
        border: isDark ? "1px solid #444" : "1px solid #ccc",
        borderRadius: 6,
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        padding: 8,
        minWidth: 140,
        fontSize: 12,
        whiteSpace: "pre-line",
        lineHeight: 1.3,
      }}
        className="animate-fade-in"
      >
        <div className="font-semibold">{person.name}</div>
        <div><span className="font-semibold">Relation:</span> {person.relation || "N/A"}</div>
        <div><span className="font-semibold">Status:</span> <span className={person.isDeceased === "Deceased" ? "text-red-500" : "text-green-600"}>{person.isDeceased}</span></div>
        <div><span className="font-semibold">Year of Birth:</span> {person.yearOfBirth}</div>
        <div><span className="font-semibold">Living Place:</span> {person.livingPlace}</div>
        <div><span className="font-semibold">Occupation:</span> {person.occupation ?? "N/A"}</div>
      </div>
    )
  }

  return (
    <g style={{ cursor: "pointer" }}>
      <foreignObject width={partner ? 340 : 200} height={100} x={partner ? -170 : -100} y={-50}>
        <div className="flex flex-row items-center justify-center gap-2 w-full h-full">
          <Card
            ref={el => (selfCardRef[1](el))}
            className="flex flex-col items-center justify-center border-2 border-gray-300 bg-white/95 dark:bg-zinc-900/95 dark:border-zinc-700 shadow-md p-3 rounded-lg w-[150px] h-[90px]"
            onMouseEnter={() => showTooltip("self")}
            onMouseLeave={hideTooltip}
          >
            <div className="rounded-full bg-gray-200 dark:bg-zinc-800 w-10 h-10 flex items-center justify-center mb-1">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-300"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2"/></svg>
            </div>
            <span className="font-medium text-center text-base dark:text-white">{nodeDatum.name}</span>
            <span className="text-xs text-muted-foreground dark:text-gray-300">{nodeDatum.attributes.relation}</span>
            <button
              className="mt-2 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
              onClick={e => {
                e.stopPropagation();
                onAdd(nodeDatum)
              }}
            >
              + Add Member
            </button>
          </Card>
          {partner && (
            <>
              <span className="text-lg font-bold text-gray-400">+</span>
              <Card
                ref={el => (partnerCardRef[1](el))}
                className="flex flex-col items-center justify-center border-2 border-gray-300 bg-white/95 dark:bg-zinc-900/95 dark:border-zinc-700 shadow-md p-3 rounded-lg w-[150px] h-[90px]"
                onMouseEnter={() => showTooltip("partner")}
                onMouseLeave={hideTooltip}
              >
                <div className="rounded-full bg-gray-200 dark:bg-zinc-800 w-10 h-10 flex items-center justify-center mb-1">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-300"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2"/></svg>
                </div>
                <span className="font-medium text-center text-base dark:text-white">{partner.name}</span>
                <span className="text-xs text-muted-foreground dark:text-gray-300">{partner.relation}</span>
              </Card>
            </>
          )}
        </div>
      </foreignObject>
      {/* Tooltip rendered in portal */}
      {hoveredPerson === "self" && tooltipPos && ReactDOM.createPortal(
        <Tooltip person={{
          name: nodeDatum.name,
          relation: nodeDatum.attributes.relation,
          isDeceased: nodeDatum.attributes.isDeceased,
          yearOfBirth: nodeDatum.attributes.yearOfBirth,
          livingPlace: nodeDatum.attributes.livingPlace,
          occupation: nodeDatum.attributes.occupation,
        }} />,
        document.body
      )}
      {hoveredPerson === "partner" && tooltipPos && partner && ReactDOM.createPortal(
        <Tooltip person={partner} />, document.body
      )}
    </g>
  )
}

export function FamilyTreeD3({ data }: FamilyTreeD3Props) {
  console.log("FamilyTreeD3 data:", data);
  // Add state for add-member modal
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addTargetNode, setAddTargetNode] = useState<any>(null)
  const [addRelationshipType, setAddRelationshipType] = useState<'child'|'parent'|'spouse'>('child')
  const [form, setForm] = useState({
    fullName: '',
    yearOfBirth: '',
    livingPlace: '',
    maritalStatus: 'Single',
    occupation: '',
    isDeceased: 'false',
    addAsAdmin: 'no',
  })
  const [membersState, setMembersState] = useState(data)
  const modalRef = useRef<HTMLDivElement>(null)

  // Convert flat data to nested tree
  const nestedData = useMemo(() => buildNestedFamilyTree(membersState), [membersState])
  const treeData = useMemo(() => transformToD3Tree(nestedData), [nestedData])

  // Center the tree horizontally
  const translate = { x: 400, y: 100 }
  const isDark = useIsDarkMode()

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
              addAsAdmin: 'no',
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
            <div className="mb-3">
              <label className="block mb-1 font-medium">Add as Admin?</label>
              <div className="flex gap-4">
                <label><input type="radio" name="addAsAdmin" value="yes" checked={form.addAsAdmin === 'yes'} onChange={e => setForm(f => ({ ...f, addAsAdmin: 'yes' }))} /> Yes</label>
                <label><input type="radio" name="addAsAdmin" value="no" checked={form.addAsAdmin === 'no'} onChange={e => setForm(f => ({ ...f, addAsAdmin: 'no' }))} /> No</label>
              </div>
            </div>
            <button type="submit" className="w-full bg-green-700 text-white py-2 rounded hover:bg-green-800 font-semibold">Add First Member</button>
          </form>
        </div>
      </div>
    )
  }

  // Add member handler (placeholder for now)
  const handleAddMember = async (e: any) => {
    e.preventDefault()
    // Simulate adding member (should call API)
    const newId = Math.random().toString(36).slice(2)
    const newMember = {
      id: newId,
      fullName: form.fullName,
      yearOfBirth: parseInt(form.yearOfBirth),
      livingPlace: form.livingPlace,
      isDeceased: form.isDeceased === 'true',
      maritalStatus: form.maritalStatus,
      occupation: form.occupation,
      relationships: [
        { type: addRelationshipType, relatedMemberId: addTargetNode.raw.id },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      familyId: addTargetNode.raw.familyId,
    }
    setMembersState(prev => [...prev, newMember])
    setAddModalOpen(false)
    setForm({
      fullName: '',
      yearOfBirth: '',
      livingPlace: '',
      maritalStatus: 'Single',
      occupation: '',
      isDeceased: 'false',
      addAsAdmin: 'no',
    })
  }

  return (
    <div style={{ width: "100%", height: "600px", overflow: "visible" }}>
      <style>{`
        :root { --tree-link-color: #888; }
        .dark { --tree-link-color: #fff; }
      `}</style>
      {/* Add Member Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" onClick={() => setAddModalOpen(false)}>
          <div ref={modalRef} className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={() => setAddModalOpen(false)}>&times;</button>
            <h2 className="text-xl font-semibold mb-4">Add Member</h2>
            <form onSubmit={handleAddMember}>
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
              <div className="mb-3">
                <label className="block mb-1 font-medium">Add as Admin?</label>
                <div className="flex gap-4">
                  <label><input type="radio" name="addAsAdmin" value="yes" checked={form.addAsAdmin === 'yes'} onChange={e => setForm(f => ({ ...f, addAsAdmin: 'yes' }))} /> Yes</label>
                  <label><input type="radio" name="addAsAdmin" value="no" checked={form.addAsAdmin === 'no'} onChange={e => setForm(f => ({ ...f, addAsAdmin: 'no' }))} /> No</label>
                </div>
              </div>
              <div className="mb-3">
                <label className="block mb-1 font-medium">Relationship Type</label>
                <select name="relationshipType" required className="w-full border rounded px-3 py-2" value={addRelationshipType} onChange={e => setAddRelationshipType(e.target.value)}>
                  <option value="child">Child</option>
                  <option value="parent">Parent</option>
                  <option value="spouse">Spouse</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-green-700 text-white py-2 rounded hover:bg-green-800 font-semibold">Add Member</button>
            </form>
          </div>
        </div>
      )}
      <Tree
        data={treeData}
        translate={translate}
        orientation="vertical"
        renderCustomNodeElement={(rd3tProps) => <CustomNode {...rd3tProps} onAdd={(node) => { setAddTargetNode(node); setAddModalOpen(true); }} />}
        pathFunc="elbow"
        zoomable={true}
        collapsible={false}
        nodeSize={{ x: 240, y: 160 }}
        separation={{ siblings: 2, nonSiblings: 2 }}
        enableLegacyTransitions={true}
        styles={{
          links: {
            stroke: isDark ? "#bbb" : "#888",
            strokeWidth: 2,
          },
        }}
      />
    </div>
  )
} 
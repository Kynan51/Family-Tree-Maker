"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"

interface FamilyMember {
  id: string
  fullName: string
  yearOfBirth: number
  livingPlace: string
  generation: number
  isDeceased: boolean
  occupation?: string
  maritalStatus?: string
  children?: FamilyMember[]
}

interface FamilyTreeChartProps {
  members: FamilyMember[]
}

function MemberCard({ member }: { member: FamilyMember }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="relative flex flex-col items-center group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Card className="w-32 h-32 flex items-center justify-center mb-2 border-2 border-gray-300">
        <CardContent className="flex flex-col items-center justify-center p-2">
          <div className="rounded-full bg-gray-200 w-12 h-12 flex items-center justify-center mb-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2"/></svg>
          </div>
          <span className="font-medium text-center text-sm">{member.fullName}</span>
        </CardContent>
      </Card>
      {/* Tooltip for details */}
      {hovered && (
        <div className="absolute z-10 -bottom-32 left-1/2 -translate-x-1/2 w-56 bg-white border border-gray-300 rounded shadow-lg p-2 text-xs animate-fade-in">
          <div><span className="font-semibold">Relation:</span> N/A</div>
          <div><span className="font-semibold">Status:</span> <span className={member.isDeceased ? 'text-red-500' : 'text-green-600'}>{member.isDeceased ? 'Deceased' : 'Alive'}</span></div>
          <div><span className="font-semibold">Year of Birth:</span> {member.yearOfBirth}</div>
          <div><span className="font-semibold">Living Place:</span> {member.livingPlace}</div>
          <div><span className="font-semibold">Occupation:</span> {member.occupation ?? 'N/A'}</div>
          <div><span className="font-semibold">Marital Status:</span> {member.maritalStatus ?? 'N/A'}</div>
        </div>
      )}
    </div>
  )
}

function renderTree(members: FamilyMember[]): JSX.Element {
  if (!members || members.length === 0) return <></>
  return (
    <div className="flex justify-center items-start space-x-8 relative">
      {members.map((member, idx) => (
        <div key={member.id} className="flex flex-col items-center">
          <MemberCard member={member} />
          {/* Draw lines to children if any */}
          {member.children && member.children.length > 0 && (
            <div className="flex flex-col items-center">
              {/* Vertical line */}
              <div className="w-0.5 h-6 bg-gray-400" />
              {/* Horizontal line and children */}
              <div className="flex items-start space-x-8 relative">
                {/* Horizontal line connecting children */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-400 -z-10" style={{marginTop: '-1px'}} />
                {renderTree(member.children)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function FamilyTreeChart({ members }: FamilyTreeChartProps) {
  // Find the root members (those with no parents)
  const rootMembers = members.filter(
    (member) => !members.some((m) => m.children?.some((c) => c.id === member.id))
  )
  return (
    <div className="overflow-x-auto py-8">
      {renderTree(rootMembers)}
    </div>
  )
}

// Add a simple fade-in animation for tooltip
// Add this to your global CSS if not present:
// .animate-fade-in { animation: fadeIn 0.2s ease; }
// @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } 
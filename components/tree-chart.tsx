"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"
import type { FamilyMember } from "@/lib/types"
import { useTheme } from "next-themes"

interface TreeChartProps {
  familyMembers: FamilyMember[]
}

interface TreeNode extends d3.HierarchyNode<FamilyMember> {
  x: number
  y: number
}

export function TreeChart({ familyMembers }: TreeChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    if (!svgRef.current || !familyMembers.length) return

    const width = 2000
    const height = 1000

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove()

    // Create hierarchy
    const rootMember = findRootMember(familyMembers)
    if (!rootMember) return

    const hierarchy = d3.hierarchy(rootMember, (d) => {
      return familyMembers.filter((m) => m.relationships?.some((r) => r.type === "child" && r.relatedMemberId === d.id))
    })

    // Create tree layout
    const treeLayout = d3
      .tree<FamilyMember>()
      .size([width - 200, height - 200])
      .nodeSize([120, 160])

    const root = treeLayout(hierarchy as any)

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(100, 50)`)

    // Add links
    svg
      .selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr(
        "d",
        d3
          .linkVertical<d3.HierarchyPointLink<FamilyMember>, d3.HierarchyPointNode<FamilyMember>>()
          .x((d) => d.x)
          .y((d) => d.y),
      )
      .attr("fill", "none")
      .attr("stroke", theme === "dark" ? "#4ade80" : "#166534")
      .attr("stroke-width", 1.5)

    // Add spouse links
    const spouseLinks: { source: TreeNode; target: TreeNode }[] = []

    root.descendants().forEach((person) => {
      const spouseRelationships = (person.data.relationships || []).filter((r) => r.type === "spouse")

      spouseRelationships.forEach((rel) => {
        const spouse = root.descendants().find((p) => p.data.id === rel.relatedMemberId)
        if (spouse) {
          spouseLinks.push({
            source: person as TreeNode,
            target: spouse as TreeNode,
          })
        }
      })
    })

    svg
      .selectAll(".spouse-link")
      .data(spouseLinks)
      .enter()
      .append("path")
      .attr("class", "spouse-link")
      .attr("d", (d) => {
        const midX = (d.source.x + d.target.x) / 2
        return `M${d.source.x},${d.source.y} 
                C${d.source.x},${d.source.y + 50} 
                 ${midX},${d.source.y + 25} 
                 ${midX},${d.source.y + 50} 
                C${midX},${d.source.y + 75} 
                 ${d.target.x},${d.target.y + 50} 
                 ${d.target.x},${d.target.y}`
      })
      .attr("fill", "none")
      .attr("stroke", theme === "dark" ? "#b8860b" : "#b8860b")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "5,5")

    // Add nodes
    const nodes = svg
      .selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)

    // Node circles
    nodes
      .append("circle")
      .attr("r", 40)
      .attr("fill", (d) =>
        d.data.isDeceased ? (theme === "dark" ? "#374151" : "#e5e7eb") : theme === "dark" ? "#065f46" : "#dcfce7",
      )
      .attr("stroke", theme === "dark" ? "#4ade80" : "#166534")
      .attr("stroke-width", 2)

    // Node images
    nodes
      .append("clipPath")
      .attr("id", (d) => `clip-${d.data.id}`)
      .append("circle")
      .attr("r", 35)

    nodes
      .append("image")
      .attr("xlink:href", (d) => d.data.photoUrl || "/placeholder.svg?height=70&width=70")
      .attr("x", -35)
      .attr("y", -35)
      .attr("width", 70)
      .attr("height", 70)
      .attr("clip-path", (d) => `url(#clip-${d.data.id})`)

    // Node text
    nodes
      .append("text")
      .attr("dy", 60)
      .attr("text-anchor", "middle")
      .attr("fill", theme === "dark" ? "white" : "black")
      .text((d) => d.data.fullName)

    nodes
      .append("text")
      .attr("dy", 80)
      .attr("text-anchor", "middle")
      .attr("fill", theme === "dark" ? "#9ca3af" : "#4b5563")
      .attr("font-size", "0.8em")
      .text((d) => d.data.yearOfBirth)
  }, [familyMembers, theme])

  // Helper function to find the root member (oldest ancestor)
  function findRootMember(members: FamilyMember[]): FamilyMember | undefined {
    // Find members who don't have parent relationships
    const potentialRoots = members.filter((member) => !member.relationships?.some((r) => r.type === "parent"))

    // Sort by birth year (oldest first)
    return potentialRoots.sort((a, b) => a.yearOfBirth - b.yearOfBirth)[0]
  }

  return (
    <div className="w-full h-full overflow-auto">
      <svg ref={svgRef} />
    </div>
  )
}

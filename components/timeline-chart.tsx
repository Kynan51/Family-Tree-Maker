"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"
import type { FamilyMember } from "@/lib/types"
import { useTheme } from "next-themes"

interface TimelineChartProps {
  familyMembers: FamilyMember[]
}

export function TimelineChart({ familyMembers }: TimelineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    if (scrollRef.current) {
      // Use requestAnimationFrame to ensure layout is ready before scrolling
      const scrollToBottom = () => {
        scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight
        scrollRef.current!.scrollLeft = 0
      }
      // Try scrolling after a short delay as well (for mobile rendering quirks)
      scrollToBottom()
      const raf = requestAnimationFrame(scrollToBottom)
      const timeout = setTimeout(scrollToBottom, 100)
      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(timeout)
      }
    }
  }, [familyMembers])

  useEffect(() => {
    if (!svgRef.current || !familyMembers.length) return

    // Sort family members by birth year
    const sortedMembers = [...familyMembers].sort((a, b) => a.yearOfBirth - b.yearOfBirth)

    const width = 2000
    const height = 10000
    const margin = { top: 50, right: 50, bottom: 50, left: 100 }

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove()

    // Create SVG
    const svg = d3.select(svgRef.current).attr("width", width).attr("height", height)

    // Create scales
    const minYear = d3.min(sortedMembers, (d) => d.yearOfBirth) || 1900
    const maxYear = d3.max(sortedMembers, (d) => d.yearOfBirth) || 2023
    const padding = 10

    const xScale = d3
      .scaleLinear()
      .domain([minYear - padding, maxYear + padding])
      .range([margin.left, width - margin.right])

    // Create axis
    const xAxis = d3.axisBottom(xScale).tickFormat((d) => `${d}`)

    svg
      .append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", theme === "dark" ? "white" : "black")

    // Add timeline line
    svg
      .append("line")
      .attr("x1", margin.left)
      .attr("y1", height - margin.bottom)
      .attr("x2", width - margin.right)
      .attr("y2", height - margin.bottom)
      .attr("stroke", theme === "dark" ? "#4ade80" : "#166534")
      .attr("stroke-width", 3)

    // Add year markers
    const yearRange = maxYear - minYear
    const yearStep = Math.ceil(yearRange / 20) * 5 // Round to nearest 5

    for (let year = Math.ceil(minYear / yearStep) * yearStep; year <= maxYear; year += yearStep) {
      svg
        .append("line")
        .attr("x1", xScale(year))
        .attr("y1", height - margin.bottom - 10)
        .attr("x2", xScale(year))
        .attr("y2", height - margin.bottom + 10)
        .attr("stroke", theme === "dark" ? "#9ca3af" : "#4b5563")
        .attr("stroke-width", 1)

      svg
        .append("text")
        .attr("x", xScale(year))
        .attr("y", height - margin.bottom + 30)
        .attr("text-anchor", "middle")
        .attr("fill", theme === "dark" ? "#9ca3af" : "#4b5563")
        .text(year)
    }

    // Group members by yearOfBirth for stacking
    const yearGroups: Record<number, FamilyMember[]> = {}
    sortedMembers.forEach(member => {
      if (!yearGroups[member.yearOfBirth]) yearGroups[member.yearOfBirth] = []
      yearGroups[member.yearOfBirth].push(member)
    })

    // Add family members to timeline, stacked by birth year
    const memberGroups = svg
      .selectAll(".member")
      .data(sortedMembers)
      .enter()
      .append("g")
      .attr("class", "member")
      .attr("transform", (d) => {
        const group = yearGroups[d.yearOfBirth]
        const indexInGroup = group.findIndex(m => m.id === d.id)
        const stackGap = 90 // vertical gap between stacked nodes
        const yStackOffset = indexInGroup * stackGap
        const baseY = height - margin.bottom - 100
        return `translate(${xScale(d.yearOfBirth)}, ${baseY - yStackOffset})`
      })

    // Add circles for each member
    memberGroups
      .append("circle")
      .attr("r", 40)
      .attr("fill", (d) =>
        d.isDeceased ? (theme === "dark" ? "#374151" : "#e5e7eb") : theme === "dark" ? "#065f46" : "#dcfce7",
      )
      .attr("stroke", theme === "dark" ? "#4ade80" : "#166534")
      .attr("stroke-width", 2)

    // Add member images
    memberGroups
      .append("clipPath")
      .attr("id", (d) => `clip-timeline-${d.id}`)
      .append("circle")
      .attr("r", 35)

    memberGroups
      .append("image")
      .attr("xlink:href", (d) => d.photoUrl || "/placeholder.svg?height=70&width=70")
      .attr("x", -35)
      .attr("y", -35)
      .attr("width", 70)
      .attr("height", 70)
      .attr("clip-path", (d) => `url(#clip-timeline-${d.id})`)

    // Add member names
    memberGroups
      .append("text")
      .attr("dy", 60)
      .attr("text-anchor", "middle")
      .attr("fill", theme === "dark" ? "white" : "black")
      .text((d) => d.fullName || "")

    // Add birth year
    memberGroups
      .append("text")
      .attr("dy", 80)
      .attr("text-anchor", "middle")
      .attr("fill", theme === "dark" ? "#9ca3af" : "#4b5563")
      .attr("font-size", "0.8em")
      .text((d) => d.yearOfBirth != null ? d.yearOfBirth : "")

    // Add connecting lines to timeline
    memberGroups
      .append("line")
      .attr("x1", 0)
      .attr("y1", 40)
      .attr("x2", 0)
      .attr("y2", (d) => {
        const group = yearGroups[d.yearOfBirth]
        const indexInGroup = group.findIndex(m => m.id === d.id)
        const stackGap = 90
        const yStackOffset = indexInGroup * stackGap
        const baseY = height - margin.bottom - 100
        return baseY - yStackOffset + 40
      })
      .attr("stroke", theme === "dark" ? "#4ade80" : "#166534")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,3")
  }, [familyMembers, theme])

  return (
    <div
      ref={scrollRef}
      className="timeline-scroll-area w-full h-full max-h-full max-w-full overflow-x-auto overflow-y-auto"
      style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%' }}
    >
      <svg ref={svgRef} style={{ minWidth: 2000, minHeight: 2000, display: 'block' }} />
    </div>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download as DownloadIcon, FileText as FileTextIcon, Image as ImageIcon } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface ExportButtonProps {
  familyId?: string
}

// Define types for member and relationship objects
interface Member {
  id: string;
  name: string;
  yearOfBirth?: number;
  livingPlace?: string;
  isDeceased?: boolean;
  maritalStatus?: string;
  occupation?: string;
  relationships?: Relationship[];
  children: Member[];
  partners: Member[];
  _rendered?: boolean;
  subtreeWidth?: number;
  subtreeHeight?: number;
  level?: number;
}

interface Relationship {
  type: 'parent' | 'child' | 'spouse';
  relatedMemberId: string;
}

// Base constants for layout
const CARD_WIDTH = 200
const CARD_HEIGHT = 150
const MIN_HORIZONTAL_SPACING = 200
const MIN_VERTICAL_SPACING = 200
const MIN_PARTNER_SPACING = 50
const PADDING = 100

// Function type definitions
type CalculateSubtreeDimensions = (member: Member, level?: number) => { width: number, height: number };
type LayoutTreeFunction = (svg: SVGSVGElement, member: Member, x: number, y: number, level?: number) => void;

// Track processed members to prevent cycles
const processedMembers = new Map<string, boolean>();

// Function to calculate subtree dimensions with cycle detection
function calculateSubtreeDimensions(member: Member, level: number = 0): { width: number; height: number } {
  // Use member's _rendered flag to detect cycles
  if (member._rendered) {
    return { width: CARD_WIDTH, height: CARD_HEIGHT };
  }

  // Mark this member as being processed
  member._rendered = true;
  member.level = level;

  // Base dimensions for this member and partners
  let width = CARD_WIDTH;
  let height = CARD_HEIGHT;

  // Add partner width if this member has partners
  if (member.partners && member.partners.length > 0) {
    width += (CARD_WIDTH + MIN_PARTNER_SPACING) * member.partners.length;
  }

  // Calculate children dimensions
  if (member.children && member.children.length > 0) {
    let childrenWidth = 0;
    let maxChildHeight = 0;

    member.children.forEach((child: Member) => {
      const childDims = calculateSubtreeDimensions(child, level + 1);
      childrenWidth += childDims.width;
      maxChildHeight = Math.max(maxChildHeight, childDims.height);
    });

    // Add spacing between children
    childrenWidth += MIN_HORIZONTAL_SPACING * (member.children.length - 1);

    // Update dimensions
    width = Math.max(width, childrenWidth);
    height += MIN_VERTICAL_SPACING + maxChildHeight;
  }

  member.subtreeWidth = width;
  member.subtreeHeight = height;

  // Clear the processed state after we're done with this branch
  member._rendered = false;

  return { width, height };
}

// Function to create a connecting line
const createConnectingLine = (x1: number, y1: number, x2: number, y2: number) => {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  // Create a path with a vertical segment from parent to child
  const midY = (y1 + y2) / 2
  path.setAttribute('d', `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`)
  path.setAttribute('stroke', '#888')
  path.setAttribute('stroke-width', '2')
  path.setAttribute('fill', 'none')
  return path
}

// Function to create a member card with text wrapping
const createMemberCard = (member: Member, x: number, y: number) => {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  group.setAttribute('transform', `translate(${x}, ${y})`)

  // Add card background
  const card = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  card.setAttribute('width', CARD_WIDTH.toString())
  card.setAttribute('height', CARD_HEIGHT.toString())
  card.setAttribute('rx', '8')
  card.setAttribute('fill', '#fff')
  card.setAttribute('stroke', '#e5e7eb')
  card.setAttribute('stroke-width', '1')
  group.appendChild(card)

  // Add member information with text wrapping
  const addText = (text: string, y: number, className: string = '', maxWidth: number = CARD_WIDTH - 20) => {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = words[0]

    for (let i = 1; i < words.length; i++) {
      const word = words[i]
      const testLine = currentLine + ' ' + word
      const testWidth = testLine.length * 7 // Approximate character width

      if (testWidth <= maxWidth) {
        currentLine = testLine
      } else {
        lines.push(currentLine)
        currentLine = word
      }
    }
    lines.push(currentLine)

    lines.forEach((line, index) => {
      const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      textElement.setAttribute('x', (CARD_WIDTH / 2).toString())
      textElement.setAttribute('y', (y + (index * 20)).toString())
      textElement.setAttribute('text-anchor', 'middle')
      textElement.setAttribute('fill', className.includes('muted') ? '#6b7280' : '#111827')
      textElement.setAttribute('font-size', className.includes('small') ? '12' : '14')
      textElement.setAttribute('font-weight', className.includes('bold') ? '600' : '400')
      textElement.textContent = line
      group.appendChild(textElement)
    })
  }

  // Add member details with text wrapping
  addText(member.name, 30, 'bold')
  if (member.maritalStatus) addText(member.maritalStatus, 50, 'muted small')
  if (member.yearOfBirth) addText(`Born: ${member.yearOfBirth}`, 70)
  if (member.livingPlace) addText(`Location: ${member.livingPlace}`, 90)
  if (member.occupation) addText(`Occupation: ${member.occupation}`, 110)
  if (member.isDeceased) addText('Deceased', 130, 'muted')

  return group
}

// Function to layout the tree
const layoutTree: LayoutTreeFunction = (svg, member, x, y, level = 0): void => {
  if (!member || member._rendered) {
    return;
  }

  // Create main member card
  const mainCard = createMemberCard(member, x, y);
  svg.appendChild(mainCard);
  member._rendered = true;

  // Handle partners (spouses)
  if (member.partners && member.partners.length > 0) {
    // Sort partners by name for consistent layout
    const sortedPartners = [...member.partners].sort((a, b) => a.name.localeCompare(b.name));
    
    // Position partners to the left and right of the main member
    const leftPartners = sortedPartners.slice(0, Math.floor(sortedPartners.length / 2));
    const rightPartners = sortedPartners.slice(Math.floor(sortedPartners.length / 2));
    
    // Add left partners
    leftPartners.forEach((partner: Member, index: number) => {
      if (!partner._rendered) {
        const partnerX = x - (CARD_WIDTH + MIN_PARTNER_SPACING) * (leftPartners.length - index);
        const partnerY = y;
        const partnerCard = createMemberCard(partner, partnerX, partnerY);
        svg.appendChild(partnerCard);
        partner._rendered = true;

        // Add connecting line between partners
        const partnerLine = createConnectingLine(
          partnerX + CARD_WIDTH,
          partnerY + CARD_HEIGHT / 2,
          x,
          y + CARD_HEIGHT / 2
        );
        svg.appendChild(partnerLine);
      }
    });

    // Add right partners
    rightPartners.forEach((partner: Member, index: number) => {
      if (!partner._rendered) {
        const partnerX = x + CARD_WIDTH + MIN_PARTNER_SPACING * (index + 1);
        const partnerY = y;
        const partnerCard = createMemberCard(partner, partnerX, partnerY);
        svg.appendChild(partnerCard);
        partner._rendered = true;

        // Add connecting line between partners
        const partnerLine = createConnectingLine(
          x + CARD_WIDTH,
          y + CARD_HEIGHT / 2,
          partnerX,
          partnerY + CARD_HEIGHT / 2
        );
        svg.appendChild(partnerLine);
      }
    });
  }

  // Add children below the parent(s)
  if (member.children && member.children.length > 0) {
    // Calculate the total width needed for all children
    const totalChildrenWidth = member.children.reduce((sum: number, child: Member) => {
      return sum + (child.subtreeWidth || 0);
    }, 0);
    const spacing = Math.max(MIN_HORIZONTAL_SPACING, (totalChildrenWidth / member.children.length) * 0.1);
    const startX = x - (totalChildrenWidth + spacing * (member.children.length - 1)) / 2;

    // Add a horizontal line above the children
    const horizontalLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    horizontalLine.setAttribute('d', `M ${startX} ${y + MIN_VERTICAL_SPACING} L ${startX + totalChildrenWidth + spacing * (member.children.length - 1)} ${y + MIN_VERTICAL_SPACING}`);
    horizontalLine.setAttribute('stroke', '#888');
    horizontalLine.setAttribute('stroke-width', '2');
    horizontalLine.setAttribute('fill', 'none');
    svg.appendChild(horizontalLine);

    // Add vertical line from parent to horizontal line
    const verticalLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    verticalLine.setAttribute('d', `M ${x + CARD_WIDTH / 2} ${y + CARD_HEIGHT} L ${x + CARD_WIDTH / 2} ${y + MIN_VERTICAL_SPACING}`);
    verticalLine.setAttribute('stroke', '#888');
    verticalLine.setAttribute('stroke-width', '2');
    verticalLine.setAttribute('fill', 'none');
    svg.appendChild(verticalLine);

    let currentX = startX;
    member.children.forEach((child: Member) => {
      const childX = currentX + ((child.subtreeWidth || 0) / 2) - (CARD_WIDTH / 2);
      const childY = y + MIN_VERTICAL_SPACING + 20;

      // Add vertical line from horizontal line to child
      const childLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      childLine.setAttribute('d', `M ${currentX + (child.subtreeWidth || 0) / 2} ${y + MIN_VERTICAL_SPACING} L ${currentX + (child.subtreeWidth || 0) / 2} ${childY}`);
      childLine.setAttribute('stroke', '#888');
      childLine.setAttribute('stroke-width', '2');
      childLine.setAttribute('fill', 'none');
      svg.appendChild(childLine);

      // Recursively layout child's subtree
      layoutTree(svg, child, childX, childY, level + 1);
      currentX += (child.subtreeWidth || 0) + spacing;
    });
  }
};

// Utility to generate SVG string for the family tree
const generateFamilyTreeSVG = (): string | null => {
  // Get members state from window
  const membersState = (window as any).__tree_members_state__
  
  if (!membersState || !Array.isArray(membersState)) {
    return null
  }

  // Create a map of all members
  const memberMap = new Map<string, Member>()
  const processedRelationships = new Set<string>()
  
  // First pass: create unique member objects
  membersState.forEach(m => {
    memberMap.set(m.id, {
      ...m,
      children: [],
      partners: [],
      subtreeWidth: 0,
      subtreeHeight: 0,
      level: 0,
      _rendered: false
    })
  })

  // Second pass: handle relationships
  membersState.forEach((member: Member) => {
    if (!member.relationships) {
      return
    }
    
    member.relationships.forEach((rel: Relationship) => {
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
        const member1 = memberMap.get(member.id)
        const member2 = relatedMember
        
        // Skip if either member is missing birth year
        if (!member1?.yearOfBirth || !member2?.yearOfBirth) {
          return
        }
        
        // The one with earlier birth year should be the parent
        const parentMember = member1.yearOfBirth < member2.yearOfBirth ? member1 : member2
        const childMember = member1.yearOfBirth < member2.yearOfBirth ? member2 : member1
        
        if (!parentMember.children) parentMember.children = []
        if (!parentMember.children.some(c => c.id === childMember.id)) {
          parentMember.children.push(childMember)
          processedRelationships.add(relationshipKey)
        }
      } else if (rel.type === "child") {
        const member1 = memberMap.get(member.id)
        const member2 = relatedMember
        
        // Skip if either member is missing birth year
        if (!member1?.yearOfBirth || !member2?.yearOfBirth) {
          return
        }
        
        // The one with earlier birth year should be the parent
        const parentMember = member1.yearOfBirth < member2.yearOfBirth ? member1 : member2
        const childMember = member1.yearOfBirth < member2.yearOfBirth ? member2 : member1
        
        if (!parentMember.children) parentMember.children = []
        if (!parentMember.children.some(c => c.id === childMember.id)) {
          parentMember.children.push(childMember)
          processedRelationships.add(relationshipKey)
        }
      } else if (rel.type === "spouse") {
        const member1 = memberMap.get(id1)
        if (member1) {
          if (!member1.partners) member1.partners = []
          if (!member1.partners.some(p => p.id === id2)) {
            const partner = memberMap.get(id2)
            if (partner) {
              member1.partners.push(partner)
              // Also add the reciprocal relationship
              if (!partner.partners) partner.partners = []
              if (!partner.partners.some(p => p.id === id1)) {
                partner.partners.push(member1)
              }
            }
          }
        }
      }
    })
  })

  // Find root members
  const rootMembers = Array.from(memberMap.values()).filter(member => {
    // A member is a root if they have no parent relationships
    const isRoot = !membersState.some(m => 
      m.relationships?.some((rel: Relationship) => 
        rel.type === "parent" && rel.relatedMemberId === member.id
      )
    )
    return isRoot
  })

  if (rootMembers.length === 0) {
    return null
  }

  // Sort root members by year of birth (oldest first)
  rootMembers.sort((a, b) => (a.yearOfBirth || 0) - (b.yearOfBirth || 0))

  // Reset rendered flag
  Array.from(memberMap.values()).forEach(member => {
    member._rendered = false
  })

  // Calculate dimensions for all root members
  let totalWidth = 0
  let maxHeight = 0
  rootMembers.forEach(root => {
    const dims = calculateSubtreeDimensions(root)
    totalWidth += dims.width
    maxHeight = Math.max(maxHeight, dims.height)
  })
  
  // Add spacing between root members
  totalWidth += MIN_HORIZONTAL_SPACING * (rootMembers.length - 1)
  
  // Add padding
  totalWidth += PADDING * 2
  maxHeight += PADDING * 2

  // Create SVG element with calculated dimensions
  const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
  svgElement.setAttribute('width', totalWidth.toString());
  svgElement.setAttribute('height', maxHeight.toString());
  svgElement.setAttribute('viewBox', `0 0 ${totalWidth} ${maxHeight}`);
  svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Add white background
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', '0');
  bg.setAttribute('y', '0');
  bg.setAttribute('width', totalWidth.toString());
  bg.setAttribute('height', maxHeight.toString());
  bg.setAttribute('fill', 'white');
  svgElement.appendChild(bg);

  // Calculate the total width needed for all root members
  const totalRootWidth = rootMembers.reduce((sum, root) => sum + (root.subtreeWidth || 0), 0);
  const rootSpacing = Math.max(MIN_HORIZONTAL_SPACING, (totalRootWidth / rootMembers.length) * 0.2);
  const startX = (totalWidth - (totalRootWidth + rootSpacing * (rootMembers.length - 1))) / 2;

  // Layout each root member
  let currentX = startX;
  rootMembers.forEach((root) => {
    const x = currentX + (root.subtreeWidth || 0) / 2 - (CARD_WIDTH / 2);
    layoutTree(svgElement, root, x, PADDING);
    currentX += (root.subtreeWidth || 0) + rootSpacing;
  });

  // Create XMLSerializer
  const serializer = new (window as any).XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);

  // Add XML declaration
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${svgString}`;
}

export function ExportButton({ familyId }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: string) => {
    try {
      setIsExporting(true)
      const currentFamilyId = familyId || (window as any).__tree_family_id__

      if (!currentFamilyId) {
        toast({
          title: "Export Failed",
          description: "Family ID not found",
          variant: "destructive",
        })
        setIsExporting(false)
        return
      }

      if (format === "excel") {
        const exportUrl = `/api/export?familyId=${currentFamilyId}&format=excel`;
        const response = await fetch(exportUrl);
        
        if (!response.ok) {
          throw new Error('Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `family-tree-${currentFamilyId}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Export Successful",
          description: "Your family tree data has been exported",
        })
        setIsExporting(false)
        return
      }

      // Get node positions and members state from window
      const nodePositions = (window as any).__tree_node_positions__
      const membersState = (window as any).__tree_members_state__

      if (!nodePositions || !membersState) {
        toast({
          title: "Export Failed",
          description: "Family tree is not loaded or visible. Please make sure the tree is displayed before exporting.",
          variant: "destructive",
        })
        setIsExporting(false)
        return
      }

      const svgString = generateFamilyTreeSVG()
      if (!svgString) {
        toast({
          title: "Export Failed",
          description: "Failed to generate SVG",
          variant: "destructive",
        })
        setIsExporting(false)
        return
      }

      if (format === "svg") {
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
        const svgUrl = URL.createObjectURL(svgBlob)
        const link = document.createElement("a")
        link.href = svgUrl
        link.download = `family-tree-${currentFamilyId}.svg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(svgUrl)
        
        toast({
          title: "Export Successful",
          description: "Your family tree has been exported as SVG",
        })
        setIsExporting(false)
      } else if (format === "png") {
        const img = new Image()
        const svg = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(svg)
        
        img.onload = () => {
          try {
            // Create a canvas with higher resolution
            const scale = 2; // Increase resolution by 2x
            const canvas = document.createElement('canvas')
            canvas.width = img.width * scale
            canvas.height = img.height * scale
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              throw new Error('Could not get canvas context')
            }
            
            // Set white background
            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            
            // Enable image smoothing
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            
            // Scale the context to match the canvas size
            ctx.scale(scale, scale)
            
            // Draw the image
            ctx.drawImage(img, 0, 0)
            
            // Convert to PNG with high quality
            const pngUrl = canvas.toDataURL('image/png', 1.0)
            const link = document.createElement("a")
            link.href = pngUrl
            link.download = `family-tree-${currentFamilyId}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            
            URL.revokeObjectURL(url)
            canvas.remove()
            
            toast({
              title: "Export Successful",
              description: "Your family tree has been exported as PNG",
            })
          } catch (error) {
            toast({
              title: "Export Failed",
              description: "Failed to convert SVG to PNG",
              variant: "destructive",
            })
          } finally {
            setIsExporting(false)
          }
        }
        
        img.onerror = (error) => {
          toast({
            title: "Export Failed",
            description: "Failed to load SVG for PNG conversion",
            variant: "destructive",
          })
          setIsExporting(false)
          URL.revokeObjectURL(url)
        }
        
        // Set crossOrigin to anonymous to avoid CORS issues
        img.crossOrigin = "anonymous"
        img.src = url
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting your data",
        variant: "destructive",
      })
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <DownloadIcon className="h-4 w-4 mr-2" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("excel")}> <FileTextIcon className="h-4 w-4 mr-2" /> Export as Excel </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("svg")}> <FileTextIcon className="h-4 w-4 mr-2" /> Export as SVG </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("png")}> <ImageIcon className="h-4 w-4 mr-2" /> Export as PNG </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

declare global {
  interface Window {
    XMLSerializer: typeof XMLSerializer;
  }
}
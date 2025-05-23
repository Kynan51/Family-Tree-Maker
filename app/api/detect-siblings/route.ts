import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-session"

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { familyId } = await request.json()

    if (!familyId) {
      return new NextResponse("Missing family ID", { status: 400 })
    }

    const supabase = createClient()

    // Get all family members without parents in this specific family
    const { data: membersWithoutParents, error: membersError } = await supabase
      .from("family_members")
      .select(`
        id,
        full_name,
        year_of_birth,
        family_id,
        relationships!member_id(
          type,
          related_member_id
        )
      `)
      .eq("family_id", familyId)

    if (membersError) {
      console.error("Error fetching members:", membersError)
      return new NextResponse("Failed to fetch family members", { status: 500 })
    }

    console.log("Total members in family:", membersWithoutParents.length)

    // Filter members without parents
    const membersWithoutParentRelations = membersWithoutParents.filter(member => {
      const hasParent = member.relationships.some(rel => rel.type === 'parent')
      console.log(`Member ${member.full_name} has parent: ${hasParent}`)
      return !hasParent
    })

    console.log("Members without parents:", membersWithoutParentRelations.length)

    // Group potential siblings by birth year ranges
    const potentialSiblings = new Map<string, typeof membersWithoutParentRelations>()
    const processedMembers = new Set<string>()
    
    // Sort members by birth year to process oldest first
    const sortedMembers = [...membersWithoutParentRelations].sort((a, b) => 
      (a.year_of_birth || 0) - (b.year_of_birth || 0)
    )

    for (const member of sortedMembers) {
      if (processedMembers.has(member.id) || !member.year_of_birth) continue

      console.log(`\nProcessing member: ${member.full_name} (${member.year_of_birth})`)
      
      // Find all members within 30 years of this member's birth year
      const siblings = sortedMembers.filter(otherMember => {
        if (processedMembers.has(otherMember.id) || !otherMember.year_of_birth || otherMember.id === member.id) {
          return false
        }
        const yearDiff = Math.abs(member.year_of_birth - otherMember.year_of_birth)
        const isSibling = yearDiff <= 30
        console.log(`Comparing with ${otherMember.full_name} (${otherMember.year_of_birth}): ${yearDiff} years diff, isSibling: ${isSibling}`)
        return isSibling
      })

      if (siblings.length > 0) {
        // Include the current member in the siblings group
        const allSiblings = [member, ...siblings]
        console.log(`Found sibling group: ${allSiblings.map(s => s.full_name).join(', ')}`)
        
        // Mark all members in this group as processed
        allSiblings.forEach(s => processedMembers.add(s.id))
        
        // Use the oldest member's birth year as the key
        const oldestBirthYear = Math.min(...allSiblings.map(m => m.year_of_birth))
        const key = `${oldestBirthYear}`
        
        potentialSiblings.set(key, allSiblings)
      } else {
        processedMembers.add(member.id)
      }
    }

    console.log("\nFound potential sibling groups:", potentialSiblings.size)

    // Create default parents for each group of siblings
    for (const [birthYear, siblings] of potentialSiblings) {
      console.log(`\nCreating parent for siblings born around ${birthYear}:`)
      siblings.forEach(s => console.log(`- ${s.full_name} (${s.year_of_birth})`))

      // Check if an unknown parent already exists for this group
      const { data: existingParents, error: findParentError } = await supabase
        .from("family_members")
        .select("id, full_name, year_of_birth")
        .eq("family_id", familyId)
        .eq("full_name", `Unknown Parent (${birthYear})`)
        .limit(1)

      let parent = existingParents && existingParents.length > 0 ? existingParents[0] : null;
      if (!parent) {
        // Create a default parent if not found
        const { data: newParent, error: parentError } = await supabase
          .from("family_members")
          .insert({
            full_name: `Unknown Parent (${birthYear})`,
            year_of_birth: parseInt(birthYear) - 30, // Assume parent is 30 years older
            living_place: "Unknown",
            is_deceased: false,
            marital_status: "Unknown",
            family_id: familyId
          })
          .select()
          .single()
        if (parentError || !newParent) {
          console.error("Error creating parent:", parentError)
          continue
        }
        parent = newParent;
      } else {
        if (parent) {
          console.log(`Found existing parent: ${parent.full_name} (${parent.year_of_birth})`)
        } else {
          console.log("Found existing parent: null")
        }
      }

      if (!parent) {
        console.error("Parent is null after creation or lookup, skipping group.");
        continue;
      }
      console.log(`Created parent: ${parent.full_name} (${parent.year_of_birth})`)

      // Create parent-child relationships
      for (const sibling of siblings) {
        // Use optional chaining to avoid null errors
        console.log(`Creating relationship between ${parent?.full_name} and ${sibling.full_name}`);
        await supabase.from("relationships").upsert([
          {
            member_id: parent!.id,
            related_member_id: sibling.id,
            type: "child"
          },
          {
            member_id: sibling.id,
            related_member_id: parent!.id,
            type: "parent"
          }
        ]);
      }
    }

    return new NextResponse("Siblings detected and parents created successfully", { status: 200 })
  } catch (error) {
    console.error("Error in detect-siblings route:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
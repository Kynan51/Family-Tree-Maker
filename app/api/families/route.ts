import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeDbFields } from "@/lib/utils"
import type { Family } from "@/lib/types"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const userId = searchParams.get("userId")

  if (!id && !userId) {
    return NextResponse.json(
      { error: "Either family ID or user ID is required" },
      { status: 400 }
    )
  }

  try {
    const supabase = createAdminClient()
    let query = supabase.from("families").select("*")

    if (id) {
      query = query.eq("id", id)
    }

    if (userId) {
      query = query.eq("owner_id", userId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Normalize family data
    const normalizedFamilies = data.map(family => 
      normalizeDbFields<Family>(family)
    )

    return NextResponse.json(
      id ? normalizedFamilies[0] : normalizedFamilies
    )
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch families" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const family = await request.json()

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("families")
      .insert({
        name: family.name,
        owner_id: family.ownerId,
        description: family.description,
        is_private: family.isPrivate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Return normalized family data
    return NextResponse.json(normalizeDbFields<Family>(data))
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create family" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...updates } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: "Family ID is required" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("families")
      .update({
        name: updates.name,
        description: updates.description,
        is_private: updates.isPrivate,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Return normalized family data
    return NextResponse.json(normalizeDbFields<Family>(data))
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update family" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json(
      { error: "Family ID is required" },
      { status: 400 }
    )
  }

  try {
    const supabase = createAdminClient()

    // First delete all family members and their relationships
    const { data: members } = await supabase
      .from("family_members")
      .select("id")
      .eq("family_id", id)

    if (members && members.length > 0) {
      const memberIds = members.map(m => m.id)
      await supabase
        .from("relationships")
        .delete()
        .or(
          `member_id.in.(${memberIds.join(",")}),` +
          `related_member_id.in.(${memberIds.join(",")})`
        )

      await supabase
        .from("family_members")
        .delete()
        .eq("family_id", id)
    }

    // Delete the family
    const { error } = await supabase
      .from("families")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete family" },
      { status: 500 }
    )
  }
}
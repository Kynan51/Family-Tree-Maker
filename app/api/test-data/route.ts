import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()
    
    // Test 1: Check app settings
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('*')
      .maybeSingle()
    
    if (settingsError) {
      console.error('Settings error:', settingsError)
    }

    // Test 2: Check family members
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select(`
        *,
        relationships!relationships_member_id_fkey (
          type,
          related_member_id
        )
      `)
      .limit(5)
    
    if (membersError) {
      console.error('Members error:', membersError)
    }

    return NextResponse.json({ 
      status: 'success',
      settings: settings || 'No settings found',
      members: members || 'No members found',
      errors: {
        settings: settingsError?.message,
        members: membersError?.message
      }
    })
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 
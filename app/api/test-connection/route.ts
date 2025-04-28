import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient() // Using anon key since this is a public test
    
    // Try a simple public query
    const { data, error } = await supabase
      .from('app_settings')
      .select('privacy_enabled')
      .limit(1)
    
    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Successfully connected to Supabase',
      data
    })
  } catch (error) {
    console.error('Connection test failed:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Failed to connect to Supabase'
    }, { status: 500 })
  }
}
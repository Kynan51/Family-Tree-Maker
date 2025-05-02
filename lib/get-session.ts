import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function getServerSession() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error("Session error:", error)
      return null
    }
    
    if (!session) {
      return null
    }
    
    return { user: session.user }
  } catch (error) {
    console.error("Error in getServerSession:", error)
    return null
  }
} 
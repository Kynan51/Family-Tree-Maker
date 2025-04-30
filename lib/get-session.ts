import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function getServerSession() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) return null
  return { user: session.user }
} 
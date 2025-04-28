import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getServerSession } from "@/lib/get-session"

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error("Error in session API:", error)
    return NextResponse.json({ user: null })
  }
}

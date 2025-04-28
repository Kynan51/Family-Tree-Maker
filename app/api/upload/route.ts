import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-session"
import { createAdminClient } from "@/lib/supabase/admin"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: Request) {
  const session = await getServerSession()

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const supabase = createAdminClient() // Admin operation for file storage
  const fileExt = file.name.split(".").pop()
  const fileName = `${uuidv4()}.${fileExt}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { data, error } = await supabase.storage.from("profile-photos").upload(fileName, buffer, {
    contentType: file.type,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(fileName)

  return NextResponse.json({ url: urlData.publicUrl })
}

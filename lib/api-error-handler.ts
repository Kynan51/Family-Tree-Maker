import { NextResponse } from "next/server"

export function handleApiError(error: unknown, defaultMessage = "An unexpected error occurred") {
  console.error("API Error:", error)

  // Determine if it's a known error type
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message || defaultMessage }, { status: 500 })
  }

  // For unknown errors
  return NextResponse.json({ error: defaultMessage }, { status: 500 })
}

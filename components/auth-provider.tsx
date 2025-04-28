"use client"

import { SessionProvider as NextAuthProvider } from "next-auth/react"

export function AuthProvider({ children }) {
  return <NextAuthProvider>{children}</NextAuthProvider>
}

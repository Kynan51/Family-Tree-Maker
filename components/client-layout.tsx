"use client"

import { useEffect, useState } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { SupabaseAuthProvider } from "@/components/supabase-auth-provider"
import { Header } from "@/components/header"
import { ErrorBoundary } from "@/components/error-boundary"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <SupabaseAuthProvider>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="light" 
        enableSystem={false} 
        themes={["light", "dark"]}
      >
        <ErrorBoundary>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </ErrorBoundary>
      </ThemeProvider>
    </SupabaseAuthProvider>
  )
} 
"use client"

import { useEffect, useState } from "react"
import { Toaster } from "@/components/ui/toaster"
import { SupabaseAuthProvider } from "@/components/supabase-auth-provider"
import { Header } from "@/components/header"
import { ErrorBoundary } from "@/components/error-boundary"
import { ThemeProvider } from "@/components/theme-provider"

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
      <ThemeProvider>
        <ErrorBoundary>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <div className="container mx-auto px-4 h-full">
                {children}
              </div>
            </main>
          </div>
          <Toaster />
        </ErrorBoundary>
      </ThemeProvider>
    </SupabaseAuthProvider>
  )
} 
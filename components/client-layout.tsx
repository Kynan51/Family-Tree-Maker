"use client"

import { useEffect, useState, lazy, Suspense, useContext } from "react"
import { usePathname } from "next/navigation"
import { Toaster } from "@/components/ui/toaster"
import { SupabaseAuthProvider } from "@/components/supabase-auth-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { ThemeProvider } from "@/components/theme-provider"
import { MaximizedContext } from "@/components/maximized-context"

// Lazy load heavy components
const Header = lazy(() => import("@/components/header").then(mod => ({ default: mod.Header })))
const Footer = lazy(() => import("@/components/footer").then(mod => ({ default: mod.Footer })))

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { isMaximized } = useContext(MaximizedContext)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    console.log("DEBUG: ClientLayout render. isMaximized:", isMaximized);
  }, [isMaximized]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <SupabaseAuthProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ErrorBoundary>
          <div className="min-h-screen flex flex-col bg-background">
            <Suspense fallback={<div className="h-14 bg-background/95 backdrop-blur" />}>
              {console.log("DEBUG: Rendering Header. isMaximized:", isMaximized)}
              {!isMaximized && <Header />}
            </Suspense>
            <main className="flex-1 relative">
              <div className="container mx-auto px-4 h-full">
                {children}
              </div>
            </main>
            <Suspense fallback={<div className="h-16 bg-background" />}>
              <Footer />
            </Suspense>
          </div>
          <Toaster />
        </ErrorBoundary>
      </ThemeProvider>
    </SupabaseAuthProvider>
  )
}
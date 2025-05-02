"use client"

import { useTheme } from "next-themes"
import Image from "next/image"

export function Footer() {
  const { theme } = useTheme()
  
  return (
    <footer className="w-full border-t border-border bg-background">
      <div className="container mx-auto px-4 py-1">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <div className="relative w-[60px] h-[60px]">
            <Image
              src="/3s1Wug01.svg"
              alt="Primal Logo"
              fill
              className={`${theme === 'dark' ? 'invert' : ''} transition-colors duration-200`}
              style={{ objectFit: 'contain' }}
            />
          </div>
          <span className="text-sm font-medium">Primal</span>
          <span className="text-sm">© 2025</span>
        </div>
      </div>
    </footer>
  )
} 
"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LoadingSpinner } from "./loading-spinner"

interface LoadingLinkProps extends React.ComponentProps<typeof Link> {
  loadingClassName?: string
  loadingSize?: "sm" | "md" | "lg"
  isCard?: boolean
}

export function LoadingLink({
  href,
  className,
  loadingClassName,
  loadingSize = "md",
  onClick,
  children,
  isCard = false,
  ...props
}: LoadingLinkProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname();

  // Clear loading state on route change
  useEffect(() => {
    setIsLoading(false)
  }, [pathname])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    // Only show spinner and navigate if href is different from current pathname
    if (href.toString() === pathname) {
      onClick?.(e)
      return
    }
    setIsLoading(true)
    // Use setTimeout to ensure the loading state is rendered before navigation
    setTimeout(() => {
      router.push(href.toString())
    }, 0)
    onClick?.(e)
  }

  return (
    <>
      {isLoading && !isCard && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-[9999]">
          <LoadingSpinner size="lg" />
        </div>
      )}
      <Link
        href={href}
        onClick={handleClick}
        className={cn("relative", className)}
        {...props}
      >
        {isLoading && isCard && (
          <div className={cn(
            "absolute inset-0 bg-background/80 flex items-center justify-center z-50",
            loadingClassName
          )}>
            <LoadingSpinner size={loadingSize} />
          </div>
        )}
        {children}
      </Link>
    </>
  )
}
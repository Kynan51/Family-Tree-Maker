"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-4">
      <div className="text-7xl font-extrabold mb-4">404</div>
      <div className="text-2xl font-semibold mb-2">Page Not Found</div>
      <div className="text-muted-foreground mb-6 text-center max-w-md">
        Sorry, the page you are looking for does not exist or has been moved.
      </div>
      <Button asChild size="lg">
        <Link href="/">Go Home</Link>
      </Button>
    </div>
  )
} 
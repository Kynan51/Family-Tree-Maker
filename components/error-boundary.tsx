"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

interface ErrorBoundaryProps {
  children: React.ReactNode
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const errorHandler = (event: ErrorEvent | PromiseRejectionEvent) => {
      let errorObj: Error
      if ("reason" in event && event.reason instanceof Error) {
        errorObj = event.reason
      } else if ("error" in event && event.error instanceof Error) {
        errorObj = event.error
      } else {
        const message =
          (event as any).reason?.message ||
          (event as any).error?.message ||
          ("message" in event ? (event as ErrorEvent).message : undefined) ||
          JSON.stringify(event) ||
          "Unknown error"
        errorObj = new Error(message)
      }
      setHasError(true)
      setError(errorObj)
    }

    window.addEventListener("error", errorHandler)
    window.addEventListener("unhandledrejection", errorHandler)

    return () => {
      window.removeEventListener("error", errorHandler)
      window.removeEventListener("unhandledrejection", errorHandler)
    }
  }, [])

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle>Something went wrong</CardTitle>
            </div>
            <CardDescription>
              An error occurred while rendering this component. Please try again or contact support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-3 rounded-md text-sm overflow-auto max-h-40">
              <p className="font-mono">{error?.message || "Unknown error"}</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

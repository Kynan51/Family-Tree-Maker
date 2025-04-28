"use client"

import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function ErrorPage() {
  const searchParams = useSearchParams()
  const missingVars = searchParams.get("missing")?.split(",") || []

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <CardTitle>Environment Variables Missing</CardTitle>
          </div>
          <CardDescription>
            The application cannot start because some required environment variables are missing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Please make sure the following environment variables are set:</p>
            <ul className="list-disc pl-5 space-y-1">
              {missingVars.map((variable) => (
                <li key={variable} className="font-mono text-sm">
                  {variable}
                </li>
              ))}
            </ul>
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-2">How to fix this:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  Create a <span className="font-mono">.env</span> file in the root of your project
                </li>
                <li>Add the missing variables with their values</li>
                <li>Restart the application</li>
              </ol>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={() => window.location.reload()}>Reload Application</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

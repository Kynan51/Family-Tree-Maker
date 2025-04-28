"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { AppSettings } from "@/lib/types"
import { updatePrivacySettings } from "@/lib/actions"

interface AdminSettingsProps {
  settings: AppSettings | null
}

export function AdminSettings({ settings }: AdminSettingsProps) {
  const [privacyEnabled, setPrivacyEnabled] = useState(settings?.privacyEnabled ?? true)
  const [isUpdating, setIsUpdating] = useState(false)

  const handlePrivacyToggle = async (enabled: boolean) => {
    setIsUpdating(true)

    try {
      await updatePrivacySettings(enabled)
      setPrivacyEnabled(enabled)

      toast({
        title: "Settings Updated",
        description: `Privacy mode has been ${enabled ? "enabled" : "disabled"}.`,
      })
    } catch (error) {
      console.error("Error updating privacy settings:", error)
      toast({
        title: "Error",
        description: "Failed to update privacy settings",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>Control how users access family trees in the application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="privacy-toggle">Enable Privacy Mode</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, users can only view family trees they have explicit permission to access.
              </p>
            </div>
            <Switch
              id="privacy-toggle"
              checked={privacyEnabled}
              onCheckedChange={handlePrivacyToggle}
              disabled={isUpdating}
            />
          </div>

          {!privacyEnabled && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Privacy Mode Disabled</AlertTitle>
              <AlertDescription>
                All authenticated users can now view all family trees in the system. This may expose sensitive family
                information.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Last updated: {settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString() : "Never"}
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

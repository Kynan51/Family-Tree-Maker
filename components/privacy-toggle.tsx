"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface PrivacyToggleProps {
  familyId: string
  initialIsPublic: boolean
}

export function PrivacyToggle({ familyId, initialIsPublic }: PrivacyToggleProps) {
  const [isPrivate, setIsPrivate] = useState(!initialIsPublic)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/families/update-privacy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          familyId,
          isPublic: !checked,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update privacy settings")
      }

      setIsPrivate(checked)
      toast.success(
        checked
          ? "Family tree is now private"
          : "Family tree is now public"
      )
    } catch (error) {
      toast.error("Failed to update privacy settings")
      // Revert the switch state on error
      setIsPrivate(!checked)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="privacy-toggle"
        checked={isPrivate}
        onCheckedChange={handleToggle}
        disabled={isLoading}
      />
      <Label htmlFor="privacy-toggle" className="text-sm font-medium">
        {isPrivate ? "Private" : "Public"}
      </Label>
    </div>
  )
} 
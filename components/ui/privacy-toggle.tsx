"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"

interface PrivacyToggleProps {
  familyId: string
  initialIsPublic: boolean
}

export function PrivacyToggle({ familyId, initialIsPublic }: PrivacyToggleProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [isUpdating, setIsUpdating] = useState(false)
  const supabase = createClient()

  const handleToggle = async (checked: boolean) => {
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from("families")
        .update({ is_public: checked })
        .eq("id", familyId)

      if (error) throw error

      setIsPublic(checked)
      toast({
        title: "Privacy Updated",
        description: `Family tree is now ${checked ? "public" : "private"}`,
      })
    } catch (error) {
      console.error("Error updating privacy:", error)
      toast({
        title: "Error",
        description: "Failed to update privacy settings",
        variant: "destructive",
      })
      // Revert the toggle if there was an error
      setIsPublic(!checked)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="privacy-toggle"
        checked={isPublic}
        onCheckedChange={handleToggle}
        disabled={isUpdating}
      />
      <Label htmlFor="privacy-toggle" className="text-sm font-medium">
        {isPublic ? "Public" : "Private"}
      </Label>
    </div>
  )
} 
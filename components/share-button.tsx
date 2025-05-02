"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface ShareButtonProps {
  familyId: string
  familyName: string
  isPublic: boolean
}

export function ShareButton({ familyId, familyName, isPublic }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const shareUrl = `${window.location.origin}/tree/${familyId}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("Link copied to clipboard!")
    } catch (err) {
      toast.error("Failed to copy link")
    }
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/send-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          familyId,
          familyName,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send invite")
      }

      toast.success("Invitation sent successfully!")
      setEmail("")
      setIsOpen(false)
    } catch (error) {
      toast.error("Failed to send invitation")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Family Tree</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Share Link</Label>
            <div className="flex gap-2 mt-1">
              <Input value={shareUrl} readOnly />
              <Button onClick={handleCopyLink} variant="outline">
                Copy
              </Button>
            </div>
            {!isPublic && (
              <p className="text-sm text-gray-500 mt-1">
                This is a private family tree. Users will need to request access to view it.
              </p>
            )}
          </div>
          <div>
            <Label>Send Email Invitation</Label>
            <form onSubmit={handleSendInvite} className="flex gap-2 mt-1">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send"}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 
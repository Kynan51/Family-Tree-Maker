"use client"

import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"

interface Notification {
  id: string
  message: string
  read: boolean
  timestamp: string
}

interface NotificationsPanelProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onClose: () => void
}

export default function NotificationsPanel({ notifications, onMarkAsRead, onClose }: NotificationsPanelProps) {
  return (
    <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-popover dark:bg-background rounded-md shadow-lg p-4 z-10">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Notifications</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {notifications.length === 0 && (
          <div className="text-sm text-muted-foreground">No notifications</div>
        )}
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-2 rounded-md ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
          >
            <div className="flex items-start justify-between">
              <p className="text-sm">{notification.message}</p>
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  Mark as read
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(new Date(notification.timestamp))} ago
            </p>
          </div>
        ))}
      </div>
    </div>
  )
} 
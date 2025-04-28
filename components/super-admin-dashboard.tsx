"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/components/ui/use-toast"
import { Shield, ShieldAlert, User } from "lucide-react"
import { updateUserRole } from "@/lib/actions"
import type { User as UserType } from "@/lib/types"

interface SuperAdminDashboardProps {
  users: UserType[]
}

export function SuperAdminDashboard({ users }: SuperAdminDashboardProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const handleRoleUpdate = async (userId: string, newRole: "admin" | "viewer") => {
    setIsUpdating(userId)

    try {
      await updateUserRole(userId, newRole)
      toast({
        title: "Role Updated",
        description: `User role has been updated to ${newRole}`,
      })
      router.refresh()
    } catch (error) {
      console.error("Error updating user role:", error)
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const adminCount = users.filter((user) => user.role === "admin").length
  const viewerCount = users.filter((user) => user.role === "viewer").length
  const superAdminCount = users.filter((user) => user.role === "super_admin").length

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-purple-50 dark:bg-purple-900/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
            <ShieldAlert className="h-4 w-4 text-purple-700 dark:text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{superAdminCount}</div>
            <p className="text-xs text-muted-foreground">Users with full system access</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-blue-700 dark:text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
            <p className="text-xs text-muted-foreground">Users with admin privileges</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-900/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Viewers</CardTitle>
            <User className="h-4 w-4 text-green-700 dark:text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{viewerCount}</div>
            <p className="text-xs text-muted-foreground">Regular users</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage user roles and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.photoUrl || "/placeholder.svg?height=32&width=32"} alt={user.name} />
                          <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === "super_admin" ? "destructive" : user.role === "admin" ? "default" : "secondary"
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {user.role !== "super_admin" && (
                        <div className="flex justify-end gap-2">
                          {user.role === "viewer" ? (
                            <Button
                              size="sm"
                              onClick={() => handleRoleUpdate(user.id, "admin")}
                              disabled={isUpdating === user.id}
                            >
                              {isUpdating === user.id ? "Updating..." : "Make Admin"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRoleUpdate(user.id, "viewer")}
                              disabled={isUpdating === user.id}
                            >
                              {isUpdating === user.id ? "Updating..." : "Remove Admin"}
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

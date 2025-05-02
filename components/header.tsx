"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Users, LogOut, Settings, User, ShieldAlert, Menu, Bell } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { createClient } from "@/lib/supabase/client"

interface UserProfile {
  id: string
  name: string
  email: string
  photoUrl?: string
  role: string
}

export function Header() {
  const { session, signOut } = useSupabaseAuth();
  const router = useRouter();
  // console.log("Header session:", session);
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Notification state (copied from user-dashboard)
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(session?.notifications || []);
  const [unreadNotifications, setUnreadNotifications] = useState(notifications.filter(n => !n.read).length);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session?.user?.id) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (!error && data) {
          setUserProfile(data);
        }
      }
    };

    fetchUserProfile();
  }, [session?.user?.id]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/auth/signin");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' });
      setUnreadNotifications(prev => prev - 1);
      setNotifications((prev) => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Use session?.user or session directly for authentication
  const isAuthenticated = !!session?.user || !!session;
  const user = session?.user || session;
  const userName = userProfile?.name || user?.name || "User";
  const userEmail = userProfile?.email || user?.email || "";
  const userPhotoUrl = userProfile?.photoUrl || user?.photoUrl || "/placeholder.svg?height=32&width=32";
  const userInitials = userName ? userName.substring(0, 2).toUpperCase() : "U";

  // Check if user is authenticated and has a role
  const userRole = userProfile?.role || user?.role || "viewer"
  const isAdmin = userRole === "admin" || userRole === "super_admin"
  const isSuperAdmin = userRole === "super_admin"

  // Navigation links
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/tree", label: "Tree View" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/admin", label: "Admin Dashboard", admin: true },
    { href: "/admin/settings", label: "Settings", admin: true },
    { href: "/super-admin", label: "Super Admin", superAdmin: true },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Users className="h-6 w-6 text-green-700 dark:text-green-500" />
            <span className="text-xl font-bold hidden sm:inline">Family Tree Maker</span>
          </Link>

          {/* Desktop nav: always show all tabs, disable if not allowed */}
          <nav className="hidden md:flex gap-6">
            {navLinks.map((link) => {
              // Skip rendering links that user doesn't have access to
              if ((link.admin && !isAdmin) || (link.superAdmin && !isSuperAdmin)) {
                return null;
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    pathname === link.href ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          {/* Notification bell button */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="sm:h-10 sm:w-10 h-9 w-9"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </Button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-popover dark:bg-background rounded-md shadow-lg p-4 z-10">
                <h3 className="font-semibold mb-2">Notifications</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {notifications.length === 0 && <div className="text-sm text-muted-foreground">No notifications</div>}
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
                            onClick={() => handleMarkNotificationAsRead(notification.id)}
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
            )}
          </div>

          {/* Mobile hamburger menu */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          )}

          {/* User menu: show profile avatar if signed in, else sign in button */}
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userPhotoUrl} alt={userName} />
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button asChild variant="default">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <nav className="flex flex-col gap-4 p-6">
            {navLinks.map((link) => {
              // Skip rendering links that user doesn't have access to
              if ((link.admin && !isAdmin) || (link.superAdmin && !isSuperAdmin)) {
                return null;
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-base font-medium transition-colors ${
                    pathname === link.href ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setDrawerOpen(false)}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
            <hr className="my-2" />
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => { handleLogout(); setDrawerOpen(false) }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </Button>
          </nav>
        </DrawerContent>
      </Drawer>
    </header>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User2, Pencil, Trash, Check, X } from "lucide-react"
import type { Family, FamilyAccess, FamilyMember } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EditFamilyMemberDialog } from "@/components/edit-family-member-dialog"
import { DeleteFamilyMemberDialog } from "@/components/delete-family-member-dialog"
import { PrivacyToggle } from "@/components/ui/privacy-toggle"
import { useRouter } from "next/navigation"
import { Users, Clock, History, Shield, FileText, UserPlus, Home } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { AddOrEditFamilyMemberWrapper } from "@/components/add-or-edit-family-member-wrapper"

interface UserDashboardProps {
  userId: string
  accessibleFamilies: Family[]
  accessRequests: (FamilyAccess & { family: Family })[]
}

export function UserDashboard({ userId, accessibleFamilies, accessRequests }: UserDashboardProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("my-families")
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null)
  const [memberToEdit, setMemberToEdit] = useState<FamilyMember | null>(null)
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [membersState, setMembersState] = useState<FamilyMember[]>(() => 
    accessibleFamilies.flatMap(family => 
      (family.members || []).map(member => ({
        ...member,
        name: member.full_name,
        familyName: family.name,
        familyId: family.id,
        yearOfBirth: member.year_of_birth,
        livingPlace: member.living_place,
        occupation: member.occupation,
        isDeceased: member.is_deceased,
        relationships: member.relationships || []
      }))
    )
  )

  // Add mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Check if user is admin in any family
  const isAdminInAnyFamily = accessibleFamilies.some(family => {
    const isCreator = family.created_by === userId;
    const isInAdmins = family.admins?.some(admin => admin.user_id === userId);
    const hasAdminAccess = accessRequests.some(access => 
      access.familyId === family.id && 
      access.accessLevel === "admin" && 
      access.status === "approved"
    );

    return isCreator || isInAdmins || hasAdminAccess;
  });

  // Get all members from accessible families
  const allFamilyMembers = accessibleFamilies.flatMap(family => 
    (family.members || []).map(member => ({
      ...member,
      name: member.full_name,
      familyName: family.name,
      familyId: family.id,
      yearOfBirth: member.year_of_birth,
      livingPlace: member.living_place,
      occupation: member.occupation,
      isDeceased: member.is_deceased,
      relationships: member.relationships || []
    }))
  );

  // Get all members from families where user is admin
  const adminFamilyMembers = accessibleFamilies
    .filter(family => 
      family.created_by === userId || 
      family.admins?.some(admin => admin.user_id === userId) ||
      accessRequests.some(access => 
        access.familyId === family.id && 
        access.accessLevel === "admin" && 
        access.status === "approved"
      )
    )
    .flatMap(family => 
      (family.members || []).map(member => ({
        ...member,
        name: member.full_name,
        familyName: family.name,
        familyId: family.id,
        yearOfBirth: member.year_of_birth,
        livingPlace: member.living_place,
        occupation: member.occupation,
        isDeceased: member.is_deceased,
        relationships: member.relationships || []
      }))
    );

  // Filter members based on selected family and search query
  const filteredMembers = (activeTab === "admin" ? adminFamilyMembers : allFamilyMembers)
    .filter(member => {
      const matchesSearch = 
        (member.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (member.livingPlace?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (member.occupation?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (member.familyName?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      if (selectedFamily) {
        return matchesSearch && member.familyId === selectedFamily;
      }
      return matchesSearch;
    });

  const handleUpdateMember = (updatedMember: FamilyMember) => {
    setMembersState(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m))
  }

  const handleDeleteMember = (id: string) => {
    setMembersState(prev => prev.filter(m => m.id !== id))
  }

  const handleAddMember = () => {
    setMemberToEdit({} as FamilyMember);
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "my-families":
        return (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accessibleFamilies.map((family) => (
              <Card
                key={family.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50",
                  selectedFamily === family.id && "border-primary"
                )}
                onClick={() => {
                  setSelectedFamily(family.id);
                  setActiveTab("my-members");
                }}
              >
                <CardHeader>
                  <CardTitle>{family.name}</CardTitle>
                  <CardDescription>{family.description}</CardDescription>
                  <div className="flex items-center gap-2">
                    {(family.created_by === userId || family.admins?.some(admin => admin.user_id === userId)) && (
                      <Badge variant="secondary">Admin</Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {family.members?.length || 0} members
                    </span>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )

      case "access-requests":
        return (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Family Name</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessRequests.length === 0 ? (
                  <TableRow key="no-requests">
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No access requests
                    </TableCell>
                  </TableRow>
                ) : (
                  accessRequests.map((request) => (
                    <TableRow key={request.id || `request-${request.family.id}-${request.requestedBy}`}>
                      <TableCell>{request.family.name}</TableCell>
                      <TableCell>{request.requestedBy}</TableCell>
                      <TableCell>
                        <Badge variant={request.status === 'PENDING' ? 'warning' : request.status === 'APPROVED' ? 'success' : 'destructive'}>
                          {request.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {request.status === 'PENDING' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )

      case "my-members":
        return (
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                className="px-3 py-2 rounded-md border bg-background"
                value={selectedFamily || ''}
                onChange={(e) => setSelectedFamily(e.target.value || null)}
              >
                <option value="">All Families</option>
                {accessibleFamilies
                  .filter(family => family.created_by === userId || family.admins?.some(admin => admin.user_id === userId))
                  .map(family => (
                    <option key={`family-${family.id}`} value={family.id}>
                      {family.name}
                    </option>
                  ))
                }
              </select>
            </div>

            {selectedFamily && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Privacy Settings:</span>
                  <PrivacyToggle 
                    familyId={selectedFamily} 
                    initialIsPublic={accessibleFamilies.find(f => f.id === selectedFamily)?.is_public || false} 
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {!accessibleFamilies.find(f => f.id === selectedFamily)?.is_public 
                    ? "Only approved members can view this family tree"
                    : "Anyone can view this family tree"}
                </p>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead>Year of Birth</TableHead>
                  <TableHead>Living Place</TableHead>
                  <TableHead>Occupation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.name}</TableCell>
                      <TableCell>{member.familyName}</TableCell>
                      <TableCell>{member.yearOfBirth}</TableCell>
                      <TableCell>{member.livingPlace}</TableCell>
                      <TableCell>{member.occupation}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setMemberToEdit(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setMemberToDelete(member)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )

      case "admin":
        return (
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select 
                  className="px-3 py-2 rounded-md border bg-background"
                  value={selectedFamily || ''}
                  onChange={(e) => setSelectedFamily(e.target.value || null)}
                >
                  <option value="">All Families</option>
                  {accessibleFamilies
                    .filter(family => family.created_by === userId || family.admins?.some(admin => admin.user_id === userId))
                    .map(family => (
                      <option key={`family-${family.id}`} value={family.id}>
                        {family.name}
                      </option>
                    ))
                  }
                </select>
              </div>
              <Button
                onClick={handleAddMember}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </div>

            {selectedFamily && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Privacy Settings:</span>
                  <PrivacyToggle 
                    familyId={selectedFamily} 
                    initialIsPublic={accessibleFamilies.find(f => f.id === selectedFamily)?.is_public || false} 
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {!accessibleFamilies.find(f => f.id === selectedFamily)?.is_public 
                    ? "Only approved members can view this family tree"
                    : "Anyone can view this family tree"}
                </p>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead>Year of Birth</TableHead>
                  <TableHead>Living Place</TableHead>
                  <TableHead>Occupation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.name}</TableCell>
                      <TableCell>{member.familyName}</TableCell>
                      <TableCell>{member.yearOfBirth}</TableCell>
                      <TableCell>{member.livingPlace}</TableCell>
                      <TableCell>{member.occupation}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setMemberToEdit(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setMemberToDelete(member)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )

      case "approval-history":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Family Name</TableHead>
                <TableHead>Member Name</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow key="no-history">
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No approval history
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )

      default:
        return null
    }
  }

  const renderMobileCards = () => {
    const cards = [
      {
        title: "My Families",
        icon: <Home className="h-6 w-6" />,
        count: accessibleFamilies?.length || 0,
        description: "View and manage your family trees",
        href: "/dashboard/families"
      },
      {
        title: "Access Requests",
        icon: <UserPlus className="h-6 w-6" />,
        count: accessRequests?.filter(r => r.status === 'PENDING').length || 0,
        description: "Manage access requests to your families",
        href: "/dashboard/access-requests",
        showActions: true,
        actions: accessRequests?.filter(r => r.status === 'PENDING').map(request => ({
          id: request.id,
          familyName: request.family.name,
          requestedBy: request.requestedBy,
          status: request.status,
          createdAt: request.createdAt
        }))
      },
      {
        title: "My Members",
        icon: <Users className="h-6 w-6" />,
        count: allFamilyMembers.length,
        description: "View and manage family members",
        href: "/dashboard/members",
        showActions: true,
        actions: filteredMembers.map(member => ({
          id: member.id,
          name: member.name,
          familyName: member.familyName,
          yearOfBirth: member.yearOfBirth,
          livingPlace: member.livingPlace,
          occupation: member.occupation
        }))
      },
      {
        title: "Approval History",
        icon: <History className="h-6 w-6" />,
        count: null,
        description: "View history of approvals and rejections",
        href: "/dashboard/approval-history"
      }
    ]

    // Add admin panel card if user is admin in any family
    if (isAdminInAnyFamily) {
      cards.push({
        title: "Admin Panel",
        icon: <Shield className="h-6 w-6" />,
        count: null,
        description: "Manage family settings and permissions",
        href: "/dashboard/admin",
        showActions: true,
        actions: filteredMembers.map(member => ({
          id: member.id,
          name: member.name,
          familyName: member.familyName,
          yearOfBirth: member.yearOfBirth,
          livingPlace: member.livingPlace,
          occupation: member.occupation
        }))
      })
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card 
            key={card.title} 
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => router.push(card.href)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {card.count !== null ? card.count : '-'}
              </div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
              {card.showActions && card.actions && card.actions.length > 0 && (
                <div className="mt-4 space-y-2">
                  {card.actions.map((action) => (
                    <div key={action.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{action.name || action.familyName}</p>
                        {action.requestedBy && (
                          <p className="text-xs text-muted-foreground">Requested by: {action.requestedBy}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {card.title === "Access Requests" && action.status === 'PENDING' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {(card.title === "My Members" || card.title === "Admin Panel") && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMemberToEdit(action as FamilyMember);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMemberToDelete(action as FamilyMember);
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="mt-[6px] animate-fade-in">
      {/* Show cards on mobile, tabs on desktop */}
      {isMobile ? (
        renderMobileCards()
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="bg-muted rounded-lg p-1">
            <nav className="flex gap-1">
              <button
                className={`flex-1 px-6 py-2.5 text-sm font-medium text-center rounded-md transition-colors
                  ${activeTab === "my-families"
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}
                `}
                onClick={() => setActiveTab("my-families")}
              >
                My Families
              </button>
              <button
                className={`flex-1 px-6 py-2.5 text-sm font-medium text-center rounded-md transition-colors
                  ${activeTab === "access-requests"
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}
                `}
                onClick={() => setActiveTab("access-requests")}
              >
                Access Requests
              </button>
              <button
                className={`flex-1 px-6 py-2.5 text-sm font-medium text-center rounded-md transition-colors
                  ${activeTab === "my-members"
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}
                `}
                onClick={() => setActiveTab("my-members")}
              >
                My Members
              </button>
              <button
                className={`flex-1 px-6 py-2.5 text-sm font-medium text-center rounded-md transition-colors
                  ${activeTab === "approval-history"
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}
                `}
                onClick={() => setActiveTab("approval-history")}
              >
                Approval History
              </button>
              {isAdminInAnyFamily && (
                <button
                  className={`flex-1 px-6 py-2.5 text-sm font-medium text-center rounded-md transition-colors
                    ${activeTab === "admin"
                      ? "bg-background text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}
                  `}
                  onClick={() => setActiveTab("admin")}
                >
                  Admin
                </button>
              )}
            </nav>
          </div>

          {/* Content Area */}
          <div className="mt-6">
            {renderTabContent()}
          </div>
        </>
      )}

      {/* Add dialogs at the end of the component */}
      {memberToEdit && (
        <AddOrEditFamilyMemberWrapper
          open={true}
          onOpenChange={() => setMemberToEdit(null)}
          member={memberToEdit}
          allMembers={allFamilyMembers}
          onUpdate={handleUpdateMember}
          accessibleFamilies={accessibleFamilies}
          userId={userId}
        />
      )}

      {memberToDelete && (
        <DeleteFamilyMemberDialog
          open={true}
          onOpenChange={() => setMemberToDelete(null)}
          member={memberToDelete}
          onDelete={handleDeleteMember}
        />
      )}
    </div>
  )
}

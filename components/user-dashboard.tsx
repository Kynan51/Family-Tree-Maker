"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User2, Pencil, Trash, Check, X } from "lucide-react"
import type { Family, FamilyAccess, FamilyMember } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { EditFamilyMemberDialog } from "@/components/edit-family-member-dialog"
import { DeleteFamilyMemberDialog } from "@/components/delete-family-member-dialog"
import { PrivacyToggle } from "@/components/privacy-toggle"

interface UserDashboardProps {
  userId: string
  accessibleFamilies: Family[]
  accessRequests: (FamilyAccess & { family: Family })[]
}

export function UserDashboard({ userId, accessibleFamilies, accessRequests }: UserDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("my-families")
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null)
  const [memberToEdit, setMemberToEdit] = useState<FamilyMember | null>(null)
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(null)
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
        isDeceased: member.is_deceased
      }))
    )
  )

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
      isDeceased: member.is_deceased
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
        isDeceased: member.is_deceased
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

  const renderTabContent = () => {
    switch (activeTab) {
      case "my-families":
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accessibleFamilies.map((family) => (
              <Card 
                key={family.id} 
                className={`p-6 cursor-pointer transition-all ${
                  selectedFamily === family.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => {
                  setSelectedFamily(family.id);
                  setActiveTab("my-members");
                }}
              >
                <h3 className="text-lg font-semibold mb-2">{family.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{family.description}</p>
                {(family.created_by === userId || family.admins?.some(admin => admin.user_id === userId)) && (
                  <Badge variant="secondary" className="mb-4">admin</Badge>
                )}
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
                    <TableRow key={`request-${request.id}`}>
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
      case "admin":
        return (
          <>
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
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Privacy Settings:</span>
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
            </div>

            <div className="flex justify-end mb-4">
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <User2 className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead>Year of Birth</TableHead>
                  <TableHead>Living Place</TableHead>
                  <TableHead>Occupation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow key="no-members">
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={`member-${member.id}-${member.familyId}`}>
                      <TableCell>{member.name}</TableCell>
                      <TableCell>{member.familyName}</TableCell>
                      <TableCell>{member.yearOfBirth}</TableCell>
                      <TableCell>{member.livingPlace}</TableCell>
                      <TableCell>{member.occupation || "N/A"}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={member.isDeceased ? "destructive" : "success"}
                          className={member.isDeceased ? "" : "bg-green-600"}
                        >
                          {member.isDeceased ? "Deceased" : "Living"}
                        </Badge>
                      </TableCell>
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
                          className="h-8 w-8"
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
          </>
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

  return (
    <div className="mt-[6px] animate-fade-in">
      {/* Tab Navigation */}
      <div className="bg-gray-100 rounded-lg p-1">
        <nav className="flex gap-1">
          <button
            className={`flex-1 px-6 py-2.5 text-sm font-medium text-center rounded-md transition-colors ${
              activeTab === "my-families"
                ? "bg-white shadow-sm"
                : "hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab("my-families")}
          >
            My Families
          </button>
          <button
            className={`flex-1 px-6 py-2.5 text-sm font-medium text-center rounded-md transition-colors ${
              activeTab === "access-requests"
                ? "bg-white shadow-sm"
                : "hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab("access-requests")}
          >
            Access Requests
          </button>
          <button
            className={`flex-1 px-6 py-2.5 text-sm font-medium text-center rounded-md transition-colors ${
              activeTab === "my-members"
                ? "bg-white shadow-sm"
                : "hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab("my-members")}
          >
            My Members
          </button>
          <button
            className={`flex-1 px-6 py-2.5 text-sm font-medium text-center rounded-md transition-colors ${
              activeTab === "approval-history"
                ? "bg-white shadow-sm"
                : "hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab("approval-history")}
          >
            Approval History
          </button>
          {isAdminInAnyFamily && (
            <button
              className={`flex-1 px-6 py-2.5 text-sm font-medium text-center rounded-md transition-colors ${
                activeTab === "admin"
                  ? "bg-white shadow-sm"
                  : "hover:bg-gray-50"
              }`}
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

      {/* Add dialogs at the end of the component */}
      {memberToEdit && (
        <EditFamilyMemberDialog
          open={true}
          onOpenChange={() => setMemberToEdit(null)}
          member={memberToEdit}
          existingMembers={allFamilyMembers}
          onUpdate={handleUpdateMember}
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

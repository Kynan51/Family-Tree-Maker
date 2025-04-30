"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, UserPlus, CheckCircle, Clock, ShieldCheck, User2 } from "lucide-react"
import type { Family, FamilyAccess } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface UserDashboardProps {
  userId: string
  accessibleFamilies: Family[]
  accessRequests: (FamilyAccess & { family: Family })[]
}

const TABS = [
  { label: "My Families" },
  { label: "Access Requests" },
  { label: "My Members" },
  { label: "Approval History" },
]

export function UserDashboard({ userId, accessibleFamilies, accessRequests }: UserDashboardProps) {
  // Dummy data for stats (replace with real data as needed)
  const stats = [
    {
      title: "Family Trees",
      value: 0,
      approved: 1,
      pending: 0,
      icon: <Users className="h-5 w-5 text-primary" />,
    },
    {
      title: "Members Added",
      value: 0,
      approvalRate: 0,
      icon: <UserPlus className="h-5 w-5 text-primary" />,
    },
    {
      title: "Approved Members",
      value: 0,
      recent: 0,
      icon: <CheckCircle className="h-5 w-5 text-primary" />,
    },
    {
      title: "Pending Members",
      value: 0,
      recentRejections: 0,
      icon: <Clock className="h-5 w-5 text-primary" />,
    },
  ]

  const [activeTab, setActiveTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")

  // Placeholder data for each tab
  const myFamiliesData = [
    {
      name: "Lucky",
      description: "This family is based in Uganda, our surnames are Lucky, although we are unlucky in matters wealth. We are rich in other immeasurable ways 🎯",
      accessLevel: "admin",
      membersAdded: "0 (Pending: 0)",
    },
  ];
  const accessRequestsData = [
    {
      family: "Lucky",
      status: "Pending",
      statusColor: "yellow",
      date: "2024-06-01",
    },
    {
      family: "Smith",
      status: "Approved",
      statusColor: "green",
      date: "2024-05-20",
    },
  ];
  const myMembersData = [
    {
      name: "John Lucky",
      family: "Lucky",
      status: "Approved",
      statusColor: "green",
      date: "2024-05-15",
    },
    {
      name: "Jane Smith",
      family: "Smith",
      status: "Pending",
      statusColor: "yellow",
      date: "2024-06-02",
    },
  ];
  const approvalHistoryData = [
    {
      name: "John Lucky",
      family: "Lucky",
      status: "Approved",
      statusColor: "green",
      date: "2024-05-15",
    },
    {
      name: "Jane Smith",
      family: "Smith",
      status: "Rejected",
      statusColor: "red",
      date: "2024-06-03",
    },
  ];

  // Filtered data for each tab
  const filteredMyFamilies = myFamiliesData.filter(fam =>
    fam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fam.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fam.accessLevel.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredAccessRequests = accessRequestsData.filter(req =>
    req.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.status.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredMyMembers = myMembersData.filter(mem =>
    mem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mem.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mem.status.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredApprovalHistory = approvalHistoryData.filter(hist =>
    hist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hist.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hist.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Dashboard Title */}
      <h1 className="text-4xl font-bold mb-2">My Dashboard</h1>

      {/* Search Bar */}
      <div className="flex items-center gap-2 mb-4 max-w-md">
        <div className="relative w-full">
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Family Trees */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Family Trees</CardTitle>
            {stats[0].icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats[0].value}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="success">{stats[0].approved} Approved</Badge>
              <Badge variant="warning">{stats[0].pending} Pending</Badge>
            </div>
          </CardContent>
        </Card>
        {/* Members Added */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Members Added</CardTitle>
            {stats[1].icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats[1].value}</div>
            <div className="w-full bg-muted h-2 rounded mt-2">
              <div className="bg-primary h-2 rounded" style={{ width: `${stats[1].approvalRate}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{stats[1].approvalRate}% Approval Rate</span>
          </CardContent>
        </Card>
        {/* Approved Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Approved Members</CardTitle>
            {stats[2].icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats[2].value}</div>
            <Badge variant="success" className="mt-2 inline-block">+{stats[2].recent} Recent</Badge>
          </CardContent>
        </Card>
        {/* Pending Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Pending Members</CardTitle>
            {stats[3].icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats[3].value}</div>
            <Badge variant="destructive" className="mt-2 inline-block">{stats[3].recentRejections} Recent Rejections</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-2">
        {TABS.map((tab, idx) => (
          <button
            key={tab.label}
            className={`px-4 py-2 rounded font-medium text-sm transition-colors ${activeTab === idx ? "bg-secondary text-primary" : "bg-muted text-muted-foreground"}`}
            onClick={() => setActiveTab(idx)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* My Family Trees Table (only for My Families tab) */}
      {activeTab === 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-1">My Family Trees</h2>
          <p className="text-muted-foreground mb-4">View and manage your accessible family trees</p>
          <div className="overflow-x-auto rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Family Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead>Members Added</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMyFamilies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">No family trees to display.</TableCell>
                  </TableRow>
                ) : (
                  filteredMyFamilies.map((fam, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{fam.name}</TableCell>
                      <TableCell>{fam.description}</TableCell>
                      <TableCell><Badge variant="secondary">{fam.accessLevel}</Badge></TableCell>
                      <TableCell>{fam.membersAdded}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary">View Tree</Button>
                          <Button size="sm" variant="outline" className="flex items-center gap-1"><User2 className="h-4 w-4" /> Add Member</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Access Requests Tab */}
      {activeTab === 1 && (
        <div>
          <h2 className="text-2xl font-semibold mb-1">Access Requests</h2>
          <p className="text-muted-foreground mb-4">View your recent access requests</p>
          <div className="overflow-x-auto rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Family Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccessRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">No access requests to display.</TableCell>
                  </TableRow>
                ) : (
                  filteredAccessRequests.map((req, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{req.family}</TableCell>
                      <TableCell>
                        <Badge variant={req.statusColor === 'green' ? 'success' : req.statusColor === 'yellow' ? 'warning' : req.statusColor === 'red' ? 'destructive' : 'secondary'}>
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{req.date}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* My Members Tab */}
      {activeTab === 2 && (
        <div>
          <h2 className="text-2xl font-semibold mb-1">My Members</h2>
          <p className="text-muted-foreground mb-4">View members you have added</p>
          <div className="overflow-x-auto rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member Name</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMyMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No members to display.</TableCell>
                  </TableRow>
                ) : (
                  filteredMyMembers.map((mem, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{mem.name}</TableCell>
                      <TableCell>{mem.family}</TableCell>
                      <TableCell>
                        <Badge variant={mem.statusColor === 'green' ? 'success' : mem.statusColor === 'yellow' ? 'warning' : mem.statusColor === 'red' ? 'destructive' : 'secondary'}>
                          {mem.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{mem.date}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Approval History Tab */}
      {activeTab === 3 && (
        <div>
          <h2 className="text-2xl font-semibold mb-1">Approval History</h2>
          <p className="text-muted-foreground mb-4">See your member approval history</p>
          <div className="overflow-x-auto rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member Name</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApprovalHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No approval history to display.</TableCell>
                  </TableRow>
                ) : (
                  filteredApprovalHistory.map((hist, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{hist.name}</TableCell>
                      <TableCell>{hist.family}</TableCell>
                      <TableCell>
                        <Badge variant={hist.statusColor === 'green' ? 'success' : hist.statusColor === 'yellow' ? 'warning' : hist.statusColor === 'red' ? 'destructive' : 'secondary'}>
                          {hist.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{hist.date}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}

export interface FamilyMember {
  id: string
  fullName: string
  yearOfBirth: number
  livingPlace: string
  isDeceased: boolean
  maritalStatus: "Single" | "Married" | "Divorced" | "Widowed"
  photoUrl?: string
  relationships?: Relationship[]
  createdAt: string
  updatedAt: string
  familyId?: string
}

export interface Relationship {
  type: "parent" | "child" | "spouse"
  relatedMemberId: string
}

export interface User {
  id: string
  email: string
  name: string
  role: "super_admin" | "admin" | "viewer"
  photoUrl?: string
  bio?: string
  createdAt: string
  updatedAt: string
}

export interface Family {
  id: string
  name: string
  description: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface FamilyAccess {
  userId: string
  familyId: string
  accessLevel: "viewer" | "editor" | "admin"
  status: "pending" | "approved" | "rejected"
  requestedAt: string
  updatedAt: string
}

export interface AppSettings {
  id: string
  privacyEnabled: boolean
  updatedAt: string
}

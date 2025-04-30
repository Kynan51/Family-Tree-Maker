export interface FamilyMember {
  id: string
  name?: string
  birthDate?: string
  deathDate?: string | null
  gender?: string
  relationship?: string
  parentId?: string | null
  spouseId?: string | null
  children?: FamilyMember[]
  metadata?: Record<string, any>
} 
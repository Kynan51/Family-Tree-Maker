import { FamilyTreeView } from "@/components/family-tree-view"
import { demoFamilyMembers } from "@/lib/demo-family-tree"

export default function DemoTreePage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Demo Family Tree</h1>
      <FamilyTreeView familyMembers={demoFamilyMembers} isAdmin={false} familyId="demo-family" />
    </div>
  )
} 
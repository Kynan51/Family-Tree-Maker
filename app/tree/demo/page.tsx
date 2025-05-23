"use client"

import { FamilyTreeView } from "@/components/family-tree-view"
import { demoFamilyMembers } from "@/lib/demo-family-tree"
import { MaximizedContextProvider } from "@/components/family-tree-client-page"
import { useMaximizedContext } from "@/components/maximized-context"

function DemoFamilyTreeViewWrapper({ familyMembers, familyId }: { familyMembers: any, familyId: string }) {
  const { isMaximized, setIsMaximized } = useMaximizedContext();
  return (
    <FamilyTreeView
      familyMembers={familyMembers}
      isAdmin={false}
      familyId={familyId}
      isMaximizedProp={isMaximized}
      setIsMaximizedProp={setIsMaximized}
    />
  );
}

export default function DemoTreePage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Demo Family Tree</h1>
      <MaximizedContextProvider>
        <DemoFamilyTreeViewWrapper familyMembers={demoFamilyMembers} familyId="demo-family" />
      </MaximizedContextProvider>
    </div>
  )
}
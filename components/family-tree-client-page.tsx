"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { FamilyTreeView } from "@/components/family-tree-view";
import { useMaximizedContext } from "@/components/maximized-context";
import type { Family } from "@/lib/types";
import type { FamilyMember } from "@/lib/types";

export const MaximizedContext = createContext({
  isMaximized: false,
  setIsMaximized: (_: boolean) => {},
});

export function MaximizedContextProvider({ children }: { children: React.ReactNode }) {
  const [isMaximized, setIsMaximized] = useState(false);
  return (
    <MaximizedContext.Provider value={{ isMaximized, setIsMaximized }}>
      {children}
    </MaximizedContext.Provider>
  );
}

export default function FamilyTreeClientPage({ family, familyMembers, isAdmin, familyId }: {
  family: Family,
  familyMembers: FamilyMember[],
  isAdmin: boolean,
  familyId: string
}) {
  const { isMaximized, setIsMaximized } = useMaximizedContext();
  useEffect(() => {
    console.log('DEBUG: FamilyTreeClientPage render. isMaximized:', isMaximized);
  }, [isMaximized]);
  return (
    <>
      {!isMaximized && (
        <h1 className="text-3xl font-bold mb-6">{family.name}</h1>
      )}
      <FamilyTreeView
        familyMembers={familyMembers}
        isAdmin={isAdmin}
        familyId={familyId}
        isMaximizedProp={isMaximized}
        setIsMaximizedProp={setIsMaximized}
        isPublic={family.isPublic}
      />
    </>
  );
}

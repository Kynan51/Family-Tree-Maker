"use client";
import { createContext, useContext, useState } from "react";

export interface MaximizedContextType {
  isMaximized: boolean;
  setIsMaximized: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export const MaximizedContext = createContext<MaximizedContextType | undefined>(undefined);

export function MaximizedContextProvider({ children }: { children: React.ReactNode }) {
  const [isMaximized, setIsMaximized] = useState(false);
  return (
    <MaximizedContext.Provider value={{ isMaximized, setIsMaximized }}>
      {children}
    </MaximizedContext.Provider>
  );
}

export function useMaximizedContext() {
  const ctx = useContext(MaximizedContext);
  if (!ctx) throw new Error("useMaximizedContext must be used within a MaximizedContextProvider");
  return ctx;
}

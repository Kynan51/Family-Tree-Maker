"use client"

import { LoadingLink } from "@/components/ui/loading-link"

interface Family {
  id: string
  name: string
  description?: string
  is_public: boolean
}

export function FamilyCard({ family }: { family: Family }) {
  return (
    <LoadingLink 
      href={`/tree/${family.id}`}
      className="card bg-card text-card-foreground rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition relative"
      loadingClassName="rounded-lg"
      isCard={true}
    >
      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-card-foreground">{family.name}</h3>
      {family.description && (
        <p className="card-description mb-4">{family.description}</p>
      )}
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded text-sm ${family.is_public ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
          {family.is_public ? 'Public' : 'Private'}
        </span>
      </div>
    </LoadingLink>
  )
} 
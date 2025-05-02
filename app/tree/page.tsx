import { getServerSession } from "@/lib/get-session"
import { createClient } from "@/lib/supabase/server"
import { ClientAuthFallback } from "@/components/client-auth-fallback"
import Link from "next/link"

export default async function TreePage() {
  const session = await getServerSession()

  if (!session) {
    return <ClientAuthFallback />
  }

  const supabase = createClient()

  // Get user's accessible families
  const { data: accessibleFamilies } = await supabase
    .from("user_family_access")
    .select(`
      family_id,
      families (
        id,
        name,
        description,
        is_public
      )
    `)
    .eq("user_id", session.user.id)
    .eq("status", "approved")

  const families = accessibleFamilies?.map(access => access.families).filter(Boolean) || []

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-10">Your Family Trees</h1>
      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-3xl mb-12">
        {/* Create Family Card */}
        <div className="card flex-1 bg-card text-card-foreground rounded-lg shadow p-8 flex flex-col items-center border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-card-foreground">Create Your Own Family Tree</h2>
          <p className="card-description mb-6 text-center dark:!text-gray-100">Start a new family tree for your family and invite relatives to join and contribute.</p>
          <Link href="/create-family" className="inline-block px-6 py-2 bg-green-700 text-white rounded hover:bg-green-800 transition">Create Family Tree</Link>
        </div>
        {/* Request Access Card */}
        <div className="card flex-1 bg-card text-card-foreground rounded-lg shadow p-8 flex flex-col items-center border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-card-foreground">Join an Existing Family Tree</h2>
          <p className="card-description mb-6 text-center dark:!text-gray-100">Search for an existing family tree and request access to join your relatives.</p>
          <Link href="/request-access" className="inline-block px-6 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition">Search & Request Access</Link>
        </div>
      </div>
      {/* Family List */}
      {families.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {families.map((family) => (
            <Link 
              key={family.id} 
              href={`/tree/${family.id}`}
              className="card bg-card text-card-foreground rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition"
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
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-600 dark:text-gray-300">
          <p>You haven't joined any family trees yet.</p>
          <p>Create a new family tree or request access to an existing one.</p>
        </div>
      )}
    </div>
  )
}

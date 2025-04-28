/**
 * Utility to validate required environment variables
 */

export function checkRequiredEnvVars() {
  const requiredVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
  ]

  const missingVars = requiredVars.filter((varName) => !process.env[varName])

  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(", ")}`)
    return false
  }

  return true
}

export function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name]
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue
    }
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/**
 * Utility for handling database errors
 */

export function handleDatabaseError(error: any, operation: string): never {
  // Log the error with context
  console.error(`Database error during ${operation}:`, error)

  // Check for specific error types
  if (error?.code === "PGRST301") {
    throw new Error(`Database connection failed: ${error.message}`)
  }

  if (error?.code === "PGRST116") {
    throw new Error(`Record not found`)
  }

  if (error?.code === "23505") {
    throw new Error(`Duplicate record: ${error.details || error.message}`)
  }

  if (error?.code === "23503") {
    throw new Error(`Foreign key constraint violation: ${error.details || error.message}`)
  }

  // Generic error
  throw new Error(`Database error during ${operation}: ${error.message || "Unknown error"}`)
}

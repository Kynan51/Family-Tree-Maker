/**
 * Utility functions for safely formatting objects for display and logging
 */

/**
 * Safely formats an object for display in UI or console
 * Handles [object Object] issues by properly converting to string
 * 
 * @param value - Any value that needs formatting
 * @param fallback - Fallback value if the original is undefined or null
 * @returns Properly formatted string representation
 */
export function formatObject(value: any, fallback: string = 'N/A'): string {
  if (value === undefined || value === null) {
    return fallback;
  }
  
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return '[Complex Object]';
    }
  }
  
  return String(value);
}

/**
 * Ensures a value is display-safe in JSX contexts
 * This helps prevent [object Object] rendering issues
 * 
 * @param value - The value to make display safe
 * @returns A string or primitive value safe for display
 */
export function ensureDisplayValue(value: any): string | number | boolean {
  if (value === undefined || value === null) {
    return '';
  }
  
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return `[Array(${value.length})]`;
    }
    return JSON.stringify(value);
  }
  
  return value;
}

/**
 * Safe JSON stringification with circular reference handling
 * 
 * @param obj - Object to stringify
 * @param indent - Optional indentation for pretty printing
 * @returns JSON string representation
 */
export function safeJsonStringify(obj: any, indent: number = 2): string {
  const seen = new WeakSet();
  
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    return value;
  }, indent);
}

/**
 * Creates a display-safe version of an object for UI rendering
 * Converts nested objects to JSON strings to prevent [object Object] issues
 * 
 * @param obj - Object to make display-safe
 * @returns A new object with all nested objects converted to strings
 */
export function createDisplaySafeObject<T extends Record<string, any>>(obj: T): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    result[key] = ensureDisplayValue(value);
  }
  
  return result;
}
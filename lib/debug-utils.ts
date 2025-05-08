/**
 * Utility functions for debugging complex objects in Next.js applications
 */

/**
 * Safely stringify complex objects for logging, handling circular references
 * @param obj - The object to stringify
 * @param maxDepth - Maximum nesting depth to include (default: 3)
 * @returns A sanitized string representation of the object
 */
export function safeStringify(obj: any, maxDepth: number = 3): string {
  const seen = new WeakSet();
  
  const replacer = (key: string, value: any): any => {
    // Skip undefined values
    if (value === undefined) {
      return '[undefined]';
    }
    
    // Handle non-objects including null
    if (value === null || typeof value !== 'object') {
      return value;
    }
    
    // Check for circular references
    if (seen.has(value)) {
      return '[Circular Reference]';
    }
    
    // Track objects for circular reference check
    seen.add(value);
    
    // Check if max depth reached
    if (maxDepth <= 0) {
      if (Array.isArray(value)) {
        return `[Array(${value.length})]`;
      }
      return '[Object]';
    }
    
    // Handle arrays and objects with recursive depth control
    if (Array.isArray(value)) {
      return value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return JSON.parse(safeStringify(item, maxDepth - 1));
        }
        return item;
      });
    }
    
    // Handle regular objects with recursive depth control
    const simplified: Record<string, any> = {};
    for (const prop in value) {
      if (Object.prototype.hasOwnProperty.call(value, prop)) {
        if (typeof value[prop] === 'object' && value[prop] !== null) {
          simplified[prop] = JSON.parse(safeStringify(value[prop], maxDepth - 1));
        } else {
          simplified[prop] = value[prop];
        }
      }
    }
    
    return simplified;
  };
  
  return JSON.stringify(obj, replacer);
}

/**
 * Log complex objects safely with depth control and circular reference handling
 * @param label - A descriptive label for the log
 * @param obj - The object to log
 * @param maxDepth - Maximum depth to log (default: 3)
 */
export function debugLog(label: string, obj: any, maxDepth: number = 3): void {
  console.log(`${label}: ${safeStringify(obj, maxDepth)}`);
}

/**
 * Analyze an object and create a structural report showing types and sample values
 * @param obj - The object to analyze
 * @returns A structural report of the object
 */
export function analyzeStructure(obj: any): Record<string, { type: string; sample: any }> {
  if (!obj || typeof obj !== 'object') {
    return { value: { type: typeof obj, sample: obj } };
  }
  
  const structure: Record<string, { type: string; sample: any }> = {};
  
  if (Array.isArray(obj)) {
    structure['[array]'] = { 
      type: 'array', 
      sample: `length: ${obj.length}` 
    };
    
    if (obj.length > 0) {
      structure['[firstItem]'] = { 
        type: typeof obj[0], 
        sample: typeof obj[0] === 'object' ? '(nested object)' : obj[0] 
      };
      
      // If first item is an object, analyze its structure
      if (typeof obj[0] === 'object' && obj[0] !== null) {
        structure['[firstItemStructure]'] = { 
          type: 'object', 
          sample: Object.keys(obj[0]) 
        };
      }
    }
    
    return structure;
  }
  
  // Regular object
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      const type = typeof value;
      
      structure[key] = {
        type,
        sample: type === 'object' 
          ? value === null 
            ? 'null' 
            : Array.isArray(value) 
              ? `Array(${value.length})` 
              : Object.keys(value).length > 0 
                ? `Object with keys: ${Object.keys(value).join(', ')}` 
                : 'Empty object'
          : String(value).substring(0, 50) // Truncate long strings
      };
    }
  }
  
  return structure;
}

/**
 * Normalize database fields by converting keys to camelCase
 * @param data - The data to normalize
 * @returns The normalized data with camelCase keys
 */
export function normalizeDbFields(data: any): any {
  if (Array.isArray(data)) {
    return data.map(normalizeDbFields);
  }

  if (data && typeof data === 'object') {
    const normalized: Record<string, any> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const camelCaseKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
        normalized[camelCaseKey] = data[key];
      }
    }
    return normalized;
  }

  return data;
}
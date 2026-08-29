// Pagination utilities for efficient data loading

export interface PaginationOptions {
  pageSize: number;
  startAfter?: any; // Last document snapshot
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: any | null;
  hasMore: boolean;
  total?: number;
}

/**
 * Create pagination cursor from document
 */
export function createCursor(doc: any): any {
  return doc; // In practice, this would be a Firestore DocumentSnapshot
}

/**
 * Check if more pages exist
 */
export function hasMorePages<T>(response: PaginatedResponse<T>): boolean {
  return response.hasMore && response.nextCursor !== null;
}

/**
 * Flatten paginated responses
 */
export function flattenPaginatedResponses<T>(
  responses: PaginatedResponse<T>[]
): T[] {
  return responses.flatMap(response => response.items);
}

/**
 * Merge paginated data with cache
 */
export function mergePaginatedData<T>(
  cachedItems: T[],
  newResponse: PaginatedResponse<T>,
  key: string = 'id'
): T[] {
  const itemMap = new Map<string, T>();
  
  // Add cached items
  cachedItems.forEach(item => {
    const k = (item as any)[key];
    itemMap.set(k, item);
  });
  
  // Add/update with new items
  newResponse.items.forEach(item => {
    const k = (item as any)[key];
    itemMap.set(k, item);
  });
  
  return Array.from(itemMap.values());
}

/**
 * Deduplicate items by key
 */
export function deduplicateItems<T>(
  items: T[],
  key: string = 'id'
): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const k = (item as any)[key];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Sort paginated items by date descending (most recent first)
 */
export function sortByDateDesc<T>(
  items: T[],
  dateKey: string = 'createdAt'
): T[] {
  return [...items].sort((a, b) => {
    const dateA = new Date((a as any)[dateKey]).getTime();
    const dateB = new Date((b as any)[dateKey]).getTime();
    return dateB - dateA;
  });
}

/**
 * Filter items by predicate
 */
export function filterItems<T>(
  items: T[],
  predicate: (item: T) => boolean
): T[] {
  return items.filter(predicate);
}
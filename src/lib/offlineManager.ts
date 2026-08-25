// Offline Storage, Action Queue & Sync Manager
import { logError } from './errorHandler';

export type OfflineActionType =
  | 'CREATE_FOLDER'
  | 'UPDATE_FOLDER'
  | 'DELETE_FOLDER'
  | 'CREATE_POST'
  | 'REACT_ITEM'
  | 'POST_COMMENT';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload?: any;
  timestamp: number;
  retryCount: number;
}

const QUEUE_STORAGE_KEY = 'geosnap_offline_queue';
const CACHE_PREFIX = 'geosnap_cache_';
const MAX_RETRIES = 3;

/**
 * Check if the browser is currently connected to the internet
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Subscribe to online/offline network changes
 */
export function subscribeOnlineStatus(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Initial call
  callback(isOnline());

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Get all queued offline actions
 */
export function getOfflineQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read offline queue:', err);
    return [];
  }
}

/**
 * Save offline action queue to localStorage
 */
function saveOfflineQueue(queue: OfflineAction[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to persist offline queue:', err);
  }
}

/**
 * Add a new action to the offline sync queue
 */
export function enqueueOfflineAction(
  type: OfflineActionType,
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE',
  payload?: any
): OfflineAction {
  const action: OfflineAction = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    endpoint,
    method,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  };

  const queue = getOfflineQueue();
  queue.push(action);
  saveOfflineQueue(queue);

  console.log(`[OfflineManager] Action enqueued (${type}):`, action);
  return action;
}

/**
 * Remove an action from the queue by ID
 */
export function dequeueOfflineAction(actionId: string): void {
  const queue = getOfflineQueue().filter((a) => a.id !== actionId);
  saveOfflineQueue(queue);
}

/**
 * Sync all pending offline actions when connection is restored
 */
export async function syncOfflineQueue(
  apiClient: any,
  onProgress?: (synced: number, total: number) => void
): Promise<{ synced: number; failed: number }> {
  if (!isOnline()) {
    console.log('[OfflineManager] Cannot sync: still offline.');
    return { synced: 0, failed: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { synced: 0, failed: 0 };
  }

  console.log(`[OfflineManager] Starting sync for ${queue.length} pending actions...`);
  let synced = 0;
  let failed = 0;
  const remainingQueue: OfflineAction[] = [];

  for (let i = 0; i < queue.length; i++) {
    const action = queue[i];
    try {
      if (action.method === 'POST') {
        await apiClient.post(action.endpoint, action.payload);
      } else if (action.method === 'PUT') {
        await apiClient.put(action.endpoint, action.payload);
      } else if (action.method === 'DELETE') {
        await apiClient.delete(action.endpoint);
      }

      synced++;
      console.log(`[OfflineManager] Synced action (${action.type}) successfully`);
    } catch (err: any) {
      logError(err, `OfflineSync_${action.type}`);
      action.retryCount = (action.retryCount || 0) + 1;

      if (action.retryCount < MAX_RETRIES) {
        remainingQueue.push(action);
      } else {
        console.warn(`[OfflineManager] Dropping action ${action.id} after ${MAX_RETRIES} failures`);
      }
      failed++;
    }

    if (onProgress) {
      onProgress(synced + failed, queue.length);
    }
  }

  saveOfflineQueue(remainingQueue);
  return { synced, failed };
}

/**
 * Cache arbitrary app data locally for offline viewing
 */
export function cacheOfflineData(key: string, data: any): void {
  try {
    const item = {
      data,
      cachedAt: Date.now(),
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(item));
  } catch (err) {
    console.warn(`[OfflineManager] Cache write failed for ${key}:`, err);
  }
}

/**
 * Retrieve cached data if offline or network fetch fails
 */
export function getCachedOfflineData<T>(key: string, maxAgeMs = 1000 * 60 * 60 * 24 * 7): T | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (Date.now() - item.cachedAt > maxAgeMs) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }
    return item.data as T;
  } catch (err) {
    console.warn(`[OfflineManager] Cache read failed for ${key}:`, err);
    return null;
  }
}

// Cleanup manager for Firestore listeners to prevent memory leaks

type UnsubscribeFn = () => void;

class ListenerCleanupManager {
  private listeners: Map<string, UnsubscribeFn[]> = new Map();

  /**
   * Register a listener for cleanup
   */
  register(key: string, unsubscribe: UnsubscribeFn): void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)!.push(unsubscribe);
  }

  /**
   * Unsubscribe all listeners for a key
   */
  cleanup(key: string): void {
    const listeners = this.listeners.get(key);
    if (!listeners) return;

    listeners.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing listener:', error);
      }
    });

    this.listeners.delete(key);
  }

  /**
   * Cleanup all listeners
   */
  cleanupAll(): void {
    this.listeners.forEach((listeners) => {
      listeners.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing listener:', error);
        }
      });
    });
    this.listeners.clear();
  }

  /**
   * Get number of active listeners
   */
  getListenerCount(key?: string): number {
    if (key) {
      return this.listeners.get(key)?.length || 0;
    }
    return Array.from(this.listeners.values()).reduce(
      (sum, arr) => sum + arr.length,
      0
    );
  }
}

export const listenerCleanup = new ListenerCleanupManager();

/**
 * React hook for automatic listener cleanup on unmount
 */
export function useListenerCleanup(key: string) {
  return {
    register: (unsubscribe: UnsubscribeFn) => {
      listenerCleanup.register(key, unsubscribe);
    },
    cleanup: () => {
      listenerCleanup.cleanup(key);
    },
  };
}

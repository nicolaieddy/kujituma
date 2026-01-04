import { offlineSyncService } from "@/services/offlineSyncService";

/**
 * Checks if an error is a network-related error (offline or fetch failure)
 */
export const isNetworkError = (error: unknown): boolean => {
  if (!navigator.onLine) return true;
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('failed to fetch') ||
      error.name === 'TypeError'
    );
  }
  
  return false;
};

/**
 * Queue a mutation for offline sync
 */
export const queueOfflineMutation = async (
  type: 'create' | 'update' | 'delete',
  table: string,
  data: unknown
): Promise<void> => {
  await offlineSyncService.queueMutation({
    type,
    table,
    data,
  });
};

/**
 * Creates a wrapper for async operations that handles offline scenarios
 */
export const createOfflineHandler = <T>(
  onlineOperation: () => Promise<T>,
  offlineOperation: () => Promise<T>,
  shouldQueueOffline: boolean = true
): (() => Promise<{ result: T; wasOffline: boolean }>) => {
  return async () => {
    try {
      const result = await onlineOperation();
      return { result, wasOffline: false };
    } catch (error) {
      if (isNetworkError(error) && shouldQueueOffline) {
        console.log('[OfflineSync] Network error detected, executing offline operation');
        const result = await offlineOperation();
        return { result, wasOffline: true };
      }
      throw error;
    }
  };
};

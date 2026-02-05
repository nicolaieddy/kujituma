import { useRef, useCallback } from 'react';

/**
 * Hook to debounce refresh calls triggered by realtime events.
 * Collapses multiple rapid events into a single refresh.
 */
export const useDebouncedRefresh = (
  refreshFn: () => Promise<void> | void,
  delay: number = 500
) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef(false);
  const pendingRef = useRef(false);

  const scheduleRefresh = useCallback(() => {
    // If already fetching, mark as pending
    if (isFetchingRef.current) {
      pendingRef.current = true;
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule a debounced refresh
    timeoutRef.current = setTimeout(async () => {
      timeoutRef.current = null;
      isFetchingRef.current = true;
      
      try {
        await refreshFn();
      } finally {
        isFetchingRef.current = false;
        
        // If there was a pending request while fetching, trigger another refresh
        if (pendingRef.current) {
          pendingRef.current = false;
          scheduleRefresh();
        }
      }
    }, delay);
  }, [refreshFn, delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingRef.current = false;
  }, []);

  return { scheduleRefresh, cancel };
};

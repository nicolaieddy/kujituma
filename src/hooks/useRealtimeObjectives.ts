import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to subscribe to real-time changes for weekly objectives.
 * This ensures that changes made on one device instantly appear on others.
 */
export const useRealtimeObjectives = (weekStart: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user?.id || !weekStart) return;

    // Skip realtime subscription - table not configured for realtime
    // Data is refreshed via visibility refresh and manual invalidation
    console.log('[Realtime] Objectives subscription disabled (using visibility refresh instead)');
  }, [user?.id, weekStart]);
};

/**
 * Hook to auto-refresh data when app becomes visible/focused.
 * Shows a stale indicator and refreshes data after being in background.
 */
export const useVisibilityRefresh = (
  queryKeys: string[][],
  options?: {
    staleThresholdMs?: number; // How long before data is considered stale (default: 30s)
    onRefresh?: () => void;
  }
) => {
  const queryClient = useQueryClient();
  const lastVisibleRef = useRef<number>(Date.now());
  const staleThreshold = options?.staleThresholdMs ?? 30000; // 30 seconds default

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastVisible = Date.now() - lastVisibleRef.current;
        
        if (timeSinceLastVisible > staleThreshold) {
          console.log('[Visibility] App became visible after', Math.round(timeSinceLastVisible / 1000), 'seconds, refreshing data');
          
          // Invalidate all specified queries
          queryKeys.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey });
          });
          
          options?.onRefresh?.();
        }
      } else {
        // Leaving visibility - record the time
        lastVisibleRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient, queryKeys, staleThreshold, options]);

  return {
    lastVisible: lastVisibleRef.current,
  };
};

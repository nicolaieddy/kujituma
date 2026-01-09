import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient, useIsMutating } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to subscribe to real-time changes for weekly objectives.
 * This ensures that changes made on one device instantly appear on others.
 * Skips invalidation during active mutations to prevent race conditions.
 */
export const useRealtimeObjectives = (weekStart: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // Track if mutations are in progress to avoid redundant refetches
  const isMutating = useIsMutating({ mutationKey: ['weekly-objectives'] });
  const isMutatingRef = useRef(isMutating);
  isMutatingRef.current = isMutating;

  useEffect(() => {
    if (!user?.id || !weekStart) return;

    console.log('[Realtime] Setting up subscription for weekly_objectives');

    const channel = supabase
      .channel(`weekly-objectives-${user.id}-${weekStart}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_objectives',
        },
        (payload) => {
          const record = (payload.new || payload.old) as { user_id?: string } | undefined;
          if (record?.user_id !== user.id) return;
          
          // Skip if we're the ones making the change (mutation in progress)
          if (isMutatingRef.current > 0) {
            console.log('[Realtime] Skipping invalidation - mutation in progress');
            return;
          }
          
          console.log('[Realtime] Objectives change from another source:', payload.eventType);
          queryClient.invalidateQueries({ 
            queryKey: ['weekly-objectives', user.id, weekStart] 
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Objectives subscription active');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, weekStart, queryClient]);
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
  
  // Store queryKeys and onRefresh in refs to avoid effect re-runs on every render
  const queryKeysRef = useRef(queryKeys);
  const onRefreshRef = useRef(options?.onRefresh);
  
  // Update refs when values change
  queryKeysRef.current = queryKeys;
  onRefreshRef.current = options?.onRefresh;

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastVisible = Date.now() - lastVisibleRef.current;
        
        if (timeSinceLastVisible > staleThreshold) {
          console.log('[Visibility] App became visible after', Math.round(timeSinceLastVisible / 1000), 'seconds, refreshing data');
          
          // Invalidate all specified queries using refs to get current values
          queryKeysRef.current.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey });
          });
          
          onRefreshRef.current?.();
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
  }, [queryClient, staleThreshold]); // Removed queryKeys and options from deps

  return {
    lastVisible: lastVisibleRef.current,
  };
};

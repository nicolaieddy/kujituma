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

    console.log('[Realtime] Setting up subscription for weekly_objectives');

    // Create a channel for weekly objectives changes
    const channel = supabase
      .channel(`weekly-objectives-${user.id}-${weekStart}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'weekly_objectives',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Received change:', payload.eventType, payload);
          
          // Invalidate the query to refetch fresh data
          // This triggers a refetch which will update the UI
          queryClient.invalidateQueries({ 
            queryKey: ['weekly-objectives', user.id, weekStart] 
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Objectives subscription active');
        } else if (status === 'CHANNEL_ERROR' && err) {
          console.warn('[Realtime] Objectives channel error:', err.message);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('[Realtime] Cleaning up subscription');
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

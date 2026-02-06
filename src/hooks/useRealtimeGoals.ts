import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Global singleton per-user goal subscription.
 *
 * IMPORTANT: `useGoals()` is used in multiple places on the Goals page (and elsewhere).
 * If each instance creates its own realtime channel, Supabase can emit CHANNEL_ERROR
 * ("mismatch between server and client bindings") and we also get duplicate invalidations.
 */
const goalsChannelState = new Map<
  string,
  {
    channel: RealtimeChannel;
    refCount: number;
    lastInvalidationAt: number;
    lastErrorLogAt: number;
  }
>();

// Rate limit error logging to once per 30 seconds
const ERROR_LOG_THROTTLE_MS = 30000;

export const useRealtimeGoals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceMs = 1000;
  const isOnlineRef = useRef(navigator.onLine);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => { isOnlineRef.current = true; };
    const handleOffline = () => { isOnlineRef.current = false; };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    
    // Don't attempt to subscribe if offline
    if (!navigator.onLine) {
      console.log('[Realtime] Skipping goals subscription - offline');
      return;
    }

    const userId = user.id;
    const existing = goalsChannelState.get(userId);

    if (existing) {
      existing.refCount += 1;
      return () => {
        const cur = goalsChannelState.get(userId);
        if (!cur) return;
        cur.refCount -= 1;
        if (cur.refCount <= 0) {
          console.log('[Realtime] Cleaning up goals subscription');
          supabase.removeChannel(cur.channel);
          goalsChannelState.delete(userId);
        }
      };
    }

    console.log('[Realtime] Setting up subscription for goals');

    const channel = supabase
      .channel(`goals-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
        },
        (payload) => {
          // Client-side filter to only handle changes for this user
          const record = (payload.new || payload.old) as { user_id?: string } | undefined;
          if (record?.user_id !== userId) return;

          const state = goalsChannelState.get(userId);
          const now = Date.now();
          if (state && now - state.lastInvalidationAt < debounceMs) {
            return; // Debounce - skip logging too
          }
          if (state) state.lastInvalidationAt = now;

          console.log('[Realtime] Goal change from another source:', payload.eventType);

          // Invalidate goals queries to refetch fresh data
          queryClient.invalidateQueries({ queryKey: ['goals', userId] });

          // Also invalidate weekly objectives since they reference goals
          queryClient.invalidateQueries({ queryKey: ['weekly-objectives'], exact: false });
        }
      )
      .subscribe((status, err) => {
        const state = goalsChannelState.get(userId);
        const now = Date.now();
        
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Goals subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          // Rate-limit error logging to prevent console spam
          if (state && now - state.lastErrorLogAt < ERROR_LOG_THROTTLE_MS) {
            return; // Skip logging
          }
          if (state) state.lastErrorLogAt = now;
          
          console.warn('[Realtime] Goals channel error (throttled):', err?.message || 'connection failed');
        }
      });

    goalsChannelState.set(userId, {
      channel,
      refCount: 1,
      lastInvalidationAt: 0,
      lastErrorLogAt: 0,
    });

    return () => {
      const cur = goalsChannelState.get(userId);
      if (!cur) return;
      cur.refCount -= 1;
      if (cur.refCount <= 0) {
        console.log('[Realtime] Cleaning up goals subscription');
        supabase.removeChannel(cur.channel);
        goalsChannelState.delete(userId);
      }
    };
  }, [user?.id, queryClient]);
};

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to subscribe to real-time changes for goals.
 * This ensures that goal status changes appear instantly across devices.
 */
export const useRealtimeGoals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    console.log('[Realtime] Setting up subscription for goals');

    // Create a channel for goals changes
    const channel = supabase
      .channel(`goals-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'goals',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Goal change:', payload.eventType, payload);
          
          // Invalidate goals queries to refetch fresh data
          queryClient.invalidateQueries({ 
            queryKey: ['goals', user.id] 
          });
          
          // Also invalidate weekly objectives since they reference goals
          queryClient.invalidateQueries({ 
            queryKey: ['weekly-objectives'],
            exact: false 
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Goals subscription active');
        } else if (status === 'CHANNEL_ERROR' && err) {
          console.warn('[Realtime] Goals channel error:', err.message);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('[Realtime] Cleaning up goals subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, queryClient]);
};

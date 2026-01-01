import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to subscribe to real-time changes for habit completions.
 * This ensures that habit tracking stays in sync across devices.
 */
export const useRealtimeHabits = (weekKey?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    console.log('[Realtime] Setting up subscription for habit_completions');

    // Create a channel for habit completions changes
    const channel = supabase
      .channel(`habit-completions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'habit_completions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Habit completion change:', payload.eventType, payload);
          
          // Invalidate habit completions queries to refetch fresh data
          queryClient.invalidateQueries({ 
            queryKey: ['habit-completions', user.id],
            exact: false 
          });
          
          // Also invalidate habit stats if they exist
          queryClient.invalidateQueries({ 
            queryKey: ['habit-stats'],
            exact: false 
          });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Habit completions subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[Realtime] Cleaning up habit completions subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, queryClient]);
};

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { HabitCompletion } from '@/types/goals';

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
          event: 'INSERT',
          schema: 'public',
          table: 'habit_completions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Habit completion INSERT:', payload.new);
          const newCompletion = payload.new as HabitCompletion;
          
          // Directly update the cache instead of invalidating
          queryClient.setQueryData<HabitCompletion[]>(
            ['habit-completions', user.id, weekKey],
            (old) => {
              if (!old) return old;
              // Check if we already have this (possibly from optimistic update)
              const exists = old.some(
                c => c.habit_item_id === newCompletion.habit_item_id && 
                     c.completion_date === newCompletion.completion_date
              );
              if (exists) {
                // Replace temp entry with real one
                return old.map(c => 
                  (c.habit_item_id === newCompletion.habit_item_id && 
                   c.completion_date === newCompletion.completion_date)
                    ? newCompletion
                    : c
                );
              }
              return [...old, newCompletion];
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'habit_completions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Habit completion DELETE:', payload.old);
          const deleted = payload.old as HabitCompletion;
          
          // Remove from cache
          queryClient.setQueryData<HabitCompletion[]>(
            ['habit-completions', user.id, weekKey],
            (old) => {
              if (!old) return old;
              return old.filter(c => c.id !== deleted.id);
            }
          );
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Habit completions subscription active');
        } else if (status === 'CHANNEL_ERROR' && err) {
          console.warn('[Realtime] Habit completions channel error:', err.message);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('[Realtime] Cleaning up habit completions subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, weekKey, queryClient]);
};

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useOptimizedAuth = () => {
  const { user } = useAuth();
  const lastActiveRef = useRef<number>(0);

  useEffect(() => {
    if (!user) return;

    const updateLastActive = async () => {
      const now = Date.now();
      // Only update every 10 minutes to reduce API calls
      if (now - lastActiveRef.current > 10 * 60 * 1000) {
        try {
          await supabase.rpc('update_user_last_active');
          lastActiveRef.current = now;
        } catch (error) {
          // Silently fail - not critical
        }
      }
    };

    // Update on mount
    updateLastActive();

    // Update on visibility change (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateLastActive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  return { user };
};
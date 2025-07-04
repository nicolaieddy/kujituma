import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useLastActive = () => {
  const { user } = useAuth();

  const updateLastActive = async () => {
    if (!user) return;
    
    try {
      await supabase.rpc('update_user_last_active');
    } catch (error) {
      // Silently fail - this is not critical functionality
      console.debug('Failed to update last active:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Update on mount
    updateLastActive();

    // Update on user interactions
    const events = ['click', 'keydown', 'scroll', 'mousemove'];
    let lastUpdate = Date.now();
    
    const throttledUpdate = () => {
      const now = Date.now();
      // Only update every 5 minutes to avoid excessive API calls
      if (now - lastUpdate > 5 * 60 * 1000) {
        updateLastActive();
        lastUpdate = now;
      }
    };

    events.forEach(event => {
      document.addEventListener(event, throttledUpdate);
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdate);
      });
    };
  }, [user]);

  return { updateLastActive };
};
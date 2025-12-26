import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const ACTIVITY_THROTTLE = 30 * 1000; // 30 seconds

export const useUserActivity = () => {
  const { user } = useAuth();
  const lastUpdateRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const updateLastActive = async () => {
    if (!user) return;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < ACTIVITY_THROTTLE) return;

    try {
      await supabase.rpc('update_user_last_active');
      lastUpdateRef.current = now;
    } catch {
      // Silent fail for activity tracking
    }
  };

  useEffect(() => {
    if (!user) return;

    updateLastActive();
    
    const intervalId = setInterval(updateLastActive, ACTIVITY_UPDATE_INTERVAL);

    let activityTimer: NodeJS.Timeout;
    const throttledActivity = () => {
      clearTimeout(activityTimer);
      activityTimer = setTimeout(updateLastActive, 10000);
    };

    const events = ['mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, throttledActivity, true));

    return () => {
      clearInterval(intervalId);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearTimeout(activityTimer);
      events.forEach(event => document.removeEventListener(event, throttledActivity, true));
    };
  }, [user]);
};
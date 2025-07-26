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
    if (now - lastUpdateRef.current < ACTIVITY_THROTTLE) {
      return;
    }

    try {
      await supabase.rpc('update_user_last_active');
      lastUpdateRef.current = now;
      console.log('Updated user last active timestamp');
    } catch (error) {
      console.error('Error updating user last active:', error);
    }
  };

  const scheduleUpdate = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      updateLastActive();
      scheduleUpdate(); // Schedule next update
    }, ACTIVITY_UPDATE_INTERVAL);
  };

  useEffect(() => {
    if (!user) return;

    // Update immediately when hook mounts
    updateLastActive();
    
    // Schedule periodic updates
    scheduleUpdate();

    // Track user activity events
    const handleUserActivity = () => {
      updateLastActive();
    };

    // Listen for user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    let activityTimer: NodeJS.Timeout;
    const throttledActivity = () => {
      clearTimeout(activityTimer);
      activityTimer = setTimeout(handleUserActivity, 10000); // Update after 10 seconds of activity
    };

    events.forEach(event => {
      document.addEventListener(event, throttledActivity, true);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      clearTimeout(activityTimer);
      events.forEach(event => {
        document.removeEventListener(event, throttledActivity, true);
      });
    };
  }, [user]);
};
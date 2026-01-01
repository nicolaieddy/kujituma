import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const SESSION_TOKEN_KEY = 'kujituma_session_token';

function generateSessionToken(): string {
  return crypto.randomUUID();
}

function getOrCreateSessionToken(): string {
  let token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = generateSessionToken();
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

export function useSessionTracking() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<string | null>(null);

  const sendHeartbeat = useCallback(async () => {
    if (!user || !sessionTokenRef.current) return;

    try {
      await (supabase.rpc as any)('upsert_session_heartbeat', {
        _session_token: sessionTokenRef.current
      });
    } catch (error) {
      console.error('Session heartbeat error:', error);
    }
  }, [user]);

  const endSession = useCallback(async () => {
    if (!sessionTokenRef.current) return;

    try {
      await (supabase.rpc as any)('end_session', {
        _session_token: sessionTokenRef.current
      });
    } catch (error) {
      console.error('End session error:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      // Clear interval if user logs out
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Get or create session token
    sessionTokenRef.current = getOrCreateSessionToken();

    // Send initial heartbeat
    sendHeartbeat();

    // Set up heartbeat interval
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Try to end session when tab becomes hidden
        endSession();
      } else if (document.visibilityState === 'visible') {
        // Resume session when tab becomes visible
        sessionTokenRef.current = getOrCreateSessionToken();
        sendHeartbeat();
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      if (sessionTokenRef.current) {
        // Use sendBeacon for reliable delivery during unload
        const url = `https://yyidkpmrqvgvzbjvtnjy.supabase.co/rest/v1/rpc/end_session`;
        navigator.sendBeacon(url, JSON.stringify({ _session_token: sessionTokenRef.current }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endSession();
    };
  }, [user, sendHeartbeat, endSession]);
}

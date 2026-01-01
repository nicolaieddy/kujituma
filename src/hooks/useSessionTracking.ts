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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const isVisibleRef = useRef(document.visibilityState === 'visible');

  const sendHeartbeat = useCallback(async () => {
    // Only send heartbeat if page is visible (user is actively viewing)
    if (!user || !sessionTokenRef.current || !isVisibleRef.current) return;

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

  const startInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  }, [sendHeartbeat]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!user) {
      stopInterval();
      return;
    }

    // Get or create session token
    sessionTokenRef.current = getOrCreateSessionToken();

    // Only start tracking if page is visible
    if (document.visibilityState === 'visible') {
      isVisibleRef.current = true;
      sendHeartbeat();
      startInterval();
    }

    // Handle page visibility changes - only track time when actively viewing
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        isVisibleRef.current = false;
        stopInterval();
        // End the current session when going to background
        endSession();
      } else if (document.visibilityState === 'visible') {
        isVisibleRef.current = true;
        // Start a fresh session when returning to foreground
        sessionTokenRef.current = getOrCreateSessionToken();
        sendHeartbeat();
        startInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      endSession();
    };
  }, [user, sendHeartbeat, endSession, startInterval, stopInterval]);
}

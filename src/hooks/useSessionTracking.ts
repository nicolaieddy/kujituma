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
  
  // Interaction counters (reset after each heartbeat)
  const clickCountRef = useRef(0);
  const scrollCountRef = useRef(0);
  const keypressCountRef = useRef(0);

  const sendHeartbeat = useCallback(async () => {
    if (!user || !sessionTokenRef.current || !isVisibleRef.current) return;

    // Capture current counts and reset
    const clicks = clickCountRef.current;
    const scrolls = scrollCountRef.current;
    const keypresses = keypressCountRef.current;
    
    clickCountRef.current = 0;
    scrollCountRef.current = 0;
    keypressCountRef.current = 0;

    try {
      await (supabase.rpc as any)('upsert_session_heartbeat', {
        _session_token: sessionTokenRef.current,
        _clicks: clicks,
        _scrolls: scrolls,
        _keypresses: keypresses
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

    // Interaction event handlers
    const handleClick = () => {
      if (isVisibleRef.current) clickCountRef.current++;
    };
    
    const handleScroll = () => {
      if (isVisibleRef.current) scrollCountRef.current++;
    };
    
    const handleKeypress = () => {
      if (isVisibleRef.current) keypressCountRef.current++;
    };

    // Only start tracking if page is visible
    if (document.visibilityState === 'visible') {
      isVisibleRef.current = true;
      sendHeartbeat();
      startInterval();
    }

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        isVisibleRef.current = false;
        stopInterval();
        endSession();
      } else if (document.visibilityState === 'visible') {
        isVisibleRef.current = true;
        sessionTokenRef.current = getOrCreateSessionToken();
        // Reset counters on visibility change
        clickCountRef.current = 0;
        scrollCountRef.current = 0;
        keypressCountRef.current = 0;
        sendHeartbeat();
        startInterval();
      }
    };

    // Add event listeners for interaction tracking
    document.addEventListener('click', handleClick, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('keydown', handleKeypress, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('keydown', handleKeypress);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      endSession();
    };
  }, [user, sendHeartbeat, endSession, startInterval, stopInterval]);
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CURRENT_TOS_VERSION } from '@/constants/tosVersion';

interface TosAcceptance {
  tos_version: string;
  accepted_at: string;
}

export type TosStatus = 'accepted' | 'needs_acceptance' | 'unknown';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const useTosAcceptance = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<TosStatus>('unknown');
  const [loading, setLoading] = useState(true);
  const [latestAcceptance, setLatestAcceptance] = useState<TosAcceptance | null>(null);
  const inFlight = useRef(false);

  const checkTosAcceptance = useCallback(async () => {
    if (!user) {
      setStatus('unknown');
      setLatestAcceptance(null);
      setLoading(false);
      return;
    }

    // Offline → we cannot make a consent claim either way. Don't gate.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      console.warn('[useTosAcceptance] Offline — skipping ToS check');
      setStatus('unknown');
      setLoading(false);
      return;
    }

    if (inFlight.current) return;
    inFlight.current = true;

    const backoffs = [0, 500, 1000, 2000];
    let lastError: unknown = null;

    try {
      for (let attempt = 0; attempt < backoffs.length; attempt++) {
        if (backoffs[attempt]) await sleep(backoffs[attempt]);
        try {
          const { data, error } = await supabase
            .from('tos_acceptances')
            .select('tos_version, accepted_at')
            .eq('user_id', user.id)
            .order('accepted_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            lastError = error;
            console.warn(`[useTosAcceptance] Fetch attempt ${attempt + 1} failed:`, error.message);
            continue;
          }

          if (data) {
            setLatestAcceptance(data);
            setStatus(data.tos_version === CURRENT_TOS_VERSION ? 'accepted' : 'needs_acceptance');
          } else {
            setLatestAcceptance(null);
            setStatus('needs_acceptance');
          }
          setLoading(false);
          return;
        } catch (e) {
          lastError = e;
          console.warn(`[useTosAcceptance] Fetch attempt ${attempt + 1} threw:`, e);
        }
      }

      // All retries failed — treat as unknown, NEVER gate.
      console.error('[useTosAcceptance] All retries failed, leaving status=unknown', lastError);
      setStatus('unknown');
      setLoading(false);
    } finally {
      inFlight.current = false;
    }
  }, [user]);

  useEffect(() => {
    checkTosAcceptance();
  }, [checkTosAcceptance]);

  // Refetch when connectivity returns
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => {
      console.log('[useTosAcceptance] Online — refetching');
      checkTosAcceptance();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [checkTosAcceptance]);

  const acceptTos = useCallback(async () => {
    if (!user) return false;

    try {
      // Defensive dedupe: if a current-version row already exists, treat as success.
      const { data: existing } = await supabase
        .from('tos_acceptances')
        .select('tos_version, accepted_at')
        .eq('user_id', user.id)
        .eq('tos_version', CURRENT_TOS_VERSION)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setStatus('accepted');
        setLatestAcceptance(existing);
        return true;
      }

      const { error } = await supabase
        .from('tos_acceptances')
        .insert({
          user_id: user.id,
          tos_version: CURRENT_TOS_VERSION,
          user_agent: navigator.userAgent,
        });

      if (error) {
        console.error('Error accepting ToS:', error);
        return false;
      }

      setStatus('accepted');
      setLatestAcceptance({
        tos_version: CURRENT_TOS_VERSION,
        accepted_at: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Error in acceptTos:', error);
      return false;
    }
  }, [user]);

  // Backwards-compat boolean: true=accepted, false=needs_acceptance, null=unknown/loading
  const hasAcceptedCurrentTos: boolean | null =
    status === 'accepted' ? true : status === 'needs_acceptance' ? false : null;

  return {
    status,
    hasAcceptedCurrentTos,
    loading,
    latestAcceptance,
    acceptTos,
    currentVersion: CURRENT_TOS_VERSION,
    refetch: checkTosAcceptance,
  };
};

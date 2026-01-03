import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CURRENT_TOS_VERSION } from '@/constants/tosVersion';

interface TosAcceptance {
  tos_version: string;
  accepted_at: string;
}

export const useTosAcceptance = () => {
  const { user } = useAuth();
  const [hasAcceptedCurrentTos, setHasAcceptedCurrentTos] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestAcceptance, setLatestAcceptance] = useState<TosAcceptance | null>(null);

  const checkTosAcceptance = useCallback(async () => {
    if (!user) {
      setHasAcceptedCurrentTos(null);
      setLoading(false);
      return;
    }

    try {
      // Use type casting since the table was just created and types aren't regenerated yet
      const result = await (supabase
        .from('tos_acceptances' as any)
        .select('tos_version, accepted_at')
        .eq('user_id', user.id)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle() as unknown as Promise<{ data: TosAcceptance | null; error: any }>);

      if (result.error) {
        console.error('Error checking ToS acceptance:', result.error);
        setHasAcceptedCurrentTos(false);
        setLoading(false);
        return;
      }

      if (result.data) {
        setLatestAcceptance(result.data);
        setHasAcceptedCurrentTos(result.data.tos_version === CURRENT_TOS_VERSION);
      } else {
        setHasAcceptedCurrentTos(false);
      }
    } catch (error) {
      console.error('Error in checkTosAcceptance:', error);
      setHasAcceptedCurrentTos(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkTosAcceptance();
  }, [checkTosAcceptance]);

  const acceptTos = useCallback(async () => {
    if (!user) return false;

    try {
      // Use type casting since the table was just created and types aren't regenerated yet
      const result = await (supabase
        .from('tos_acceptances' as any)
        .insert({
          user_id: user.id,
          tos_version: CURRENT_TOS_VERSION,
          user_agent: navigator.userAgent
        }) as unknown as Promise<{ error: any }>);

      if (result.error) {
        console.error('Error accepting ToS:', result.error);
        return false;
      }

      setHasAcceptedCurrentTos(true);
      setLatestAcceptance({
        tos_version: CURRENT_TOS_VERSION,
        accepted_at: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Error in acceptTos:', error);
      return false;
    }
  }, [user]);

  return {
    hasAcceptedCurrentTos,
    loading,
    latestAcceptance,
    acceptTos,
    currentVersion: CURRENT_TOS_VERSION,
    refetch: checkTosAcceptance
  };
};

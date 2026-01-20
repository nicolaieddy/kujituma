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
      const { data, error } = await supabase
        .from('tos_acceptances')
        .select('tos_version, accepted_at')
        .eq('user_id', user.id)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking ToS acceptance:', error);
        setHasAcceptedCurrentTos(false);
        setLoading(false);
        return;
      }

      if (data) {
        setLatestAcceptance(data);
        setHasAcceptedCurrentTos(data.tos_version === CURRENT_TOS_VERSION);
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
      const { error } = await supabase
        .from('tos_acceptances')
        .insert({
          user_id: user.id,
          tos_version: CURRENT_TOS_VERSION,
          user_agent: navigator.userAgent
        });

      if (error) {
        console.error('Error accepting ToS:', error);
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

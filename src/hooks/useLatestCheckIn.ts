import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LatestCheckIn {
  id: string;
  message: string | null;
  created_at: string;
  initiator_id: string;
  initiator_profile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useLatestCheckIn = (partnershipId: string | undefined) => {
  const query = useQuery<LatestCheckIn | null>({
    queryKey: ['latest-check-in', partnershipId],
    enabled: !!partnershipId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accountability_check_ins')
        .select('id, message, created_at, initiator_id, initiator_profile:profiles!accountability_check_ins_initiator_id_fkey(full_name, avatar_url)')
        .eq('partnership_id', partnershipId!)
        .is('parent_check_in_id', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as LatestCheckIn) ?? null;
    },
  });

  // Live updates when new check-ins arrive
  useEffect(() => {
    if (!partnershipId) return;
    const channel = supabase
      .channel(`latest-check-in-${partnershipId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accountability_check_ins',
          filter: `partnership_id=eq.${partnershipId}`,
        },
        () => query.refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnershipId, query]);

  return query;
};

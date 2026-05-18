import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Tracks unread check-in messages from the OTHER party in a partnership.
 * Unread = check-ins (incl. replies) created after the current user's
 * `partnership_check_in_reads.last_seen_at`, authored by the partner.
 */
export const usePartnershipUnread = (partnershipId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<number>({
    queryKey: ['partnership-unread', partnershipId, user?.id],
    enabled: !!partnershipId && !!user,
    staleTime: 15 * 1000,
    queryFn: async () => {
      if (!partnershipId || !user) return 0;

      const { data: readRow } = await supabase
        .from('partnership_check_in_reads')
        .select('last_seen_at')
        .eq('user_id', user.id)
        .eq('partnership_id', partnershipId)
        .maybeSingle();

      const since = readRow?.last_seen_at ?? '1970-01-01T00:00:00Z';

      const { count, error } = await supabase
        .from('accountability_check_ins')
        .select('id', { count: 'exact', head: true })
        .eq('partnership_id', partnershipId)
        .neq('initiated_by', user.id)
        .gt('created_at', since);

      if (error) throw error;
      return count ?? 0;
    },
  });

  // Realtime: new check-in from partner -> refetch
  useEffect(() => {
    if (!partnershipId || !user) return;
    const channel = supabase
      .channel(`partnership-unread-${partnershipId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
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
  }, [partnershipId, user, query]);

  const markAsRead = useCallback(async () => {
    if (!partnershipId || !user) return;
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('partnership_check_in_reads')
      .upsert(
        { user_id: user.id, partnership_id: partnershipId, last_seen_at: nowIso },
        { onConflict: 'user_id,partnership_id' }
      );
    if (!error) {
      queryClient.setQueryData(['partnership-unread', partnershipId, user.id], 0);
      queryClient.invalidateQueries({ queryKey: ['partnership-unread'] });
      queryClient.invalidateQueries({ queryKey: ['all-partnerships-unread'] });
    }
  }, [partnershipId, user, queryClient]);

  return { unreadCount: query.data ?? 0, markAsRead, refetch: query.refetch };
};

/**
 * Aggregated unread counts across multiple partnerships,
 * keyed by partnership_id. Used by the PartnerSwitcher.
 */
export const useAllPartnershipsUnread = (partnershipIds: string[]) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const stableKey = [...partnershipIds].sort().join(',');

  const query = useQuery<Record<string, number>>({
    queryKey: ['all-partnerships-unread', stableKey, user?.id],
    enabled: !!user && partnershipIds.length > 0,
    staleTime: 15 * 1000,
    queryFn: async () => {
      if (!user || partnershipIds.length === 0) return {};

      const { data: reads } = await supabase
        .from('partnership_check_in_reads')
        .select('partnership_id, last_seen_at')
        .eq('user_id', user.id)
        .in('partnership_id', partnershipIds);

      const readMap: Record<string, string> = {};
      for (const r of reads || []) readMap[r.partnership_id] = r.last_seen_at;

      const { data: checkIns, error } = await supabase
        .from('accountability_check_ins')
        .select('partnership_id, created_at, initiated_by')
        .in('partnership_id', partnershipIds)
        .neq('initiated_by', user.id);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const c of checkIns || []) {
        const since = readMap[c.partnership_id];
        if (!since || new Date(c.created_at) > new Date(since)) {
          counts[c.partnership_id] = (counts[c.partnership_id] || 0) + 1;
        }
      }
      return counts;
    },
  });

  // Realtime invalidation when any new check-in lands for these partnerships
  useEffect(() => {
    if (!user || partnershipIds.length === 0) return;
    const channel = supabase
      .channel(`all-partnerships-unread-${stableKey.slice(0, 50)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'accountability_check_ins' },
        (payload) => {
          const pid = (payload.new as any)?.partnership_id;
          if (pid && partnershipIds.includes(pid)) {
            queryClient.invalidateQueries({ queryKey: ['all-partnerships-unread'] });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [stableKey, user, queryClient, partnershipIds]);

  return query.data ?? {};
};

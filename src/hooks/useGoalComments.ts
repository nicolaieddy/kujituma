import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useGoalCommentCounts = (goalIds: string[]) => {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['goal-comment-counts', goalIds.join(',')],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!goalIds.length) return {};
      const { data, error } = await supabase
        .from('goal_comments')
        .select('goal_id')
        .in('goal_id', goalIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        counts[row.goal_id] = (counts[row.goal_id] || 0) + 1;
      }
      return counts;
    },
    enabled: !!user && goalIds.length > 0,
    staleTime: 60 * 1000,
  });

  return data ?? {};
};

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ObjectiveCounts {
  total: number;
  completed: number;
}

export type GoalObjectiveCounts = Record<string, ObjectiveCounts>;

/**
 * Hook to fetch objective counts (total and completed) for all goals.
 * Returns a map of goal_id -> { total, completed }
 */
export const useGoalObjectiveCounts = () => {
  const { user } = useAuth();

  const { data: counts = {}, isLoading, error } = useQuery({
    queryKey: ['goal-objective-counts', user?.id],
    queryFn: async (): Promise<GoalObjectiveCounts> => {
      const { data, error: rpcError } = await supabase.rpc('get_goals_objective_counts');

      if (rpcError) {
        console.error('[useGoalObjectiveCounts] RPC error:', rpcError);
        throw rpcError;
      }

      return (data as unknown as GoalObjectiveCounts) || {};
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    counts,
    isLoading,
    error,
    getCountsForGoal: (goalId: string): ObjectiveCounts => counts[goalId] || { total: 0, completed: 0 },
  };
};

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { WeeklyObjective } from "@/types/weeklyProgress";

interface CarryOverData {
  incompleteObjectives: WeeklyObjective[];
  carriedOverSet: Set<string>;
  dismissedSet: Set<string>;
}

/**
 * Optimized hook that fetches carry-over data in a single database call.
 * Uses the get_carryover_data RPC function instead of 3 separate queries.
 */
export const useCarryOverDataOptimized = (currentWeekStart: string) => {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['carryover-data', user?.id, currentWeekStart],
    queryFn: async (): Promise<CarryOverData> => {
      const { data: result, error: rpcError } = await supabase.rpc(
        'get_carryover_data',
        { p_current_week_start: currentWeekStart }
      );

      if (rpcError) {
        console.error('[useCarryOverDataOptimized] RPC error:', rpcError);
        throw rpcError;
      }

      const parsed = result as unknown as {
        incomplete_objectives: WeeklyObjective[];
        current_future_objectives: { text: string; goal_id: string | null }[];
        dismissed_objectives: { objective_text: string; goal_id: string | null }[];
      };

      // Build sets for efficient lookup
      const carriedOverSet = new Set<string>();
      (parsed.current_future_objectives || []).forEach(obj => {
        const key = `${obj.text}|${obj.goal_id || ''}`;
        carriedOverSet.add(key);
      });

      const dismissedSet = new Set<string>();
      (parsed.dismissed_objectives || []).forEach(obj => {
        const key = `${obj.objective_text}|${obj.goal_id || ''}`;
        dismissedSet.add(key);
      });

      // Filter incomplete objectives
      const filteredIncomplete = (parsed.incomplete_objectives || []).filter(obj => {
        const key = `${obj.text}|${obj.goal_id || ''}`;
        return !carriedOverSet.has(key) && !dismissedSet.has(key);
      });

      return {
        incompleteObjectives: filteredIncomplete,
        carriedOverSet,
        dismissedSet,
      };
    },
    enabled: !!user && !!currentWeekStart,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    incompleteObjectives: data?.incompleteObjectives || [],
    isLoading,
    error,
    refetch,
  };
};

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { WeeklyObjective, WeeklyProgressPost } from "@/types/weeklyProgress";

interface WeeklyPlanningSession {
  id: string;
  user_id: string;
  week_start: string;
  week_intention: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface WeeklyDashboardData {
  objectives: WeeklyObjective[];
  progressPost: WeeklyProgressPost | null;
  planningSession: WeeklyPlanningSession | null;
  lastWeekObjectives: WeeklyObjective[];
  lastWeekPost: WeeklyProgressPost | null;
  lastWeekPlanning: WeeklyPlanningSession | null;
}

/**
 * Hook that fetches all weekly dashboard data in a single database call.
 * This consolidates what was previously 6+ separate queries into 1 RPC call.
 */
export const useWeeklyDashboardData = (weekStart: string) => {
  const { user } = useAuth();

  const lastWeekStart = useMemo(() => {
    return WeeklyProgressService.addDaysToWeekStart(weekStart, -7);
  }, [weekStart]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['weekly-dashboard', user?.id, weekStart],
    queryFn: async (): Promise<WeeklyDashboardData> => {
      const { data: result, error: rpcError } = await supabase.rpc(
        'get_weekly_dashboard_data',
        {
          p_week_start: weekStart,
          p_last_week_start: lastWeekStart,
        }
      );

      if (rpcError) {
        console.error('[useWeeklyDashboardData] RPC error:', rpcError);
        throw rpcError;
      }

      // Parse the JSONB response
      const parsed = result as unknown as {
        objectives: WeeklyObjective[];
        progress_post: WeeklyProgressPost | null;
        planning_session: WeeklyPlanningSession | null;
        last_week_objectives: WeeklyObjective[];
        last_week_post: WeeklyProgressPost | null;
        last_week_planning: WeeklyPlanningSession | null;
      };

      return {
        objectives: parsed.objectives || [],
        progressPost: parsed.progress_post || null,
        planningSession: parsed.planning_session || null,
        lastWeekObjectives: parsed.last_week_objectives || [],
        lastWeekPost: parsed.last_week_post || null,
        lastWeekPlanning: parsed.last_week_planning || null,
      };
    },
    enabled: !!user && !!weekStart,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  return {
    // Current week data
    objectives: data?.objectives || [],
    progressPost: data?.progressPost || null,
    planningSession: data?.planningSession || null,
    
    // Last week data
    lastWeekObjectives: data?.lastWeekObjectives || [],
    lastWeekPost: data?.lastWeekPost || null,
    lastWeekPlanning: data?.lastWeekPlanning || null,
    lastWeekStart,
    
    // Loading states
    isLoading,
    isFetching,
    error,
    refetch,
  };
};

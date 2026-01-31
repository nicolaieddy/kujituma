import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Goal } from "@/types/goals";
import { parseGoals } from "@/utils/goalUtils";
import { HabitStreaksService, HabitStats } from "@/services/habitStreaksService";
import { startOfWeek, parseISO, isAfter } from "date-fns";

interface HabitStatsData {
  goals_with_habits: any[];
  habit_objectives: any[];
}

/**
 * Optimized hook that fetches habit stats data in a single database call.
 * Uses the get_habit_stats_data RPC function.
 */
export const useHabitStatsOptimized = (options: { enabled?: boolean } = {}) => {
  const { user } = useAuth();
  const enabled = (options.enabled ?? true) && !!user;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["habit-stats-optimized", user?.id],
    queryFn: async (): Promise<{ habitStats: HabitStats[]; futureHabits: Goal[] }> => {
      const { data: result, error: rpcError } = await supabase.rpc('get_habit_stats_data');

      if (rpcError) {
        console.error('[useHabitStatsOptimized] RPC error:', rpcError);
        throw rpcError;
      }

      const parsed = result as unknown as HabitStatsData;
      const goalsWithHabits = parseGoals(parsed.goals_with_habits || []);
      const objectives = parsed.habit_objectives || [];

      // Filter out goals that haven't started yet
      const today = new Date();
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
      
      const activeGoals = goalsWithHabits.filter(goal => {
        if (goal.start_date) {
          const goalStartDate = parseISO(goal.start_date);
          const goalStartWeek = startOfWeek(goalStartDate, { weekStartsOn: 1 });
          if (isAfter(goalStartWeek, currentWeekStart)) {
            return false;
          }
        }
        return true;
      });

      const futureHabits = goalsWithHabits.filter(goal => {
        if (goal.start_date) {
          const goalStartDate = parseISO(goal.start_date);
          const goalStartWeek = startOfWeek(goalStartDate, { weekStartsOn: 1 });
          return isAfter(goalStartWeek, currentWeekStart);
        }
        return false;
      }).sort((a, b) => {
        const dateA = a.start_date ? parseISO(a.start_date) : new Date();
        const dateB = b.start_date ? parseISO(b.start_date) : new Date();
        return dateA.getTime() - dateB.getTime();
      });

      // Calculate stats for each goal using existing service method
      const habitStats = activeGoals.map(goal => 
        HabitStreaksService.calculateHabitStats(goal, objectives)
      );

      return { habitStats, futureHabits };
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const habitStats = data?.habitStats || [];
  const futureHabits = data?.futureHabits || [];

  // Calculate aggregate stats
  const totalHabits = habitStats.length;
  const activeHabits = habitStats.filter(
    (h) => h.goal.status === "not_started" || h.goal.status === "in_progress"
  ).length;
  const averageCompletionRate =
    totalHabits > 0
      ? Math.round(habitStats.reduce((sum, h) => sum + h.completionRate, 0) / totalHabits)
      : 0;
  const totalCurrentStreak = habitStats.reduce((sum, h) => sum + h.currentStreak, 0);

  return {
    habitStats,
    futureHabits,
    isLoading,
    error,
    refetch,
    totalHabits,
    activeHabits,
    averageCompletionRate,
    totalCurrentStreak,
  };
};

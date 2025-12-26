import { useQuery } from "@tanstack/react-query";
import { HabitStreaksService, HabitStats } from "@/services/habitStreaksService";
import { useAuth } from "@/contexts/AuthContext";
import { Goal } from "@/types/goals";

export const useHabitStats = () => {
  const { user } = useAuth();

  const { data: habitStats = [], isLoading, error, refetch } = useQuery({
    queryKey: ['habit-stats', user?.id],
    queryFn: async () => {
      return HabitStreaksService.getAllHabitStats();
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: futureHabits = [] } = useQuery<Goal[]>({
    queryKey: ['future-habits', user?.id],
    queryFn: async () => {
      return HabitStreaksService.getFutureHabits();
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Calculate aggregate stats
  const totalHabits = habitStats.length;
  const activeHabits = habitStats.filter(h => 
    h.goal.status === 'not_started' || h.goal.status === 'in_progress'
  ).length;
  const averageCompletionRate = totalHabits > 0
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
    totalCurrentStreak
  };
};

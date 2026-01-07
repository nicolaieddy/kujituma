import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { DailyStreakService, DailyStreakStats } from "@/services/dailyStreakService";

export const useDailyStreaks = () => {
  const { user } = useAuth();

  const { data: streaks = [], isLoading, error, refetch } = useQuery({
    queryKey: ["daily-streaks", user?.id],
    queryFn: () => DailyStreakService.getAllHabitStreaks(),
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get streak for a specific habit item
  const getHabitStreak = (habitItemId: string): DailyStreakStats | undefined => {
    return streaks.find(s => s.habitItemId === habitItemId);
  };

  // Aggregate stats
  const totalCurrentStreak = streaks.reduce((sum, s) => sum + s.currentStreak, 0);
  const activeStreaks = streaks.filter(s => s.streakStatus === 'active').length;
  const atRiskStreaks = streaks.filter(s => s.streakStatus === 'at_risk').length;
  const totalFreezesRemaining = streaks.reduce((sum, s) => sum + s.freezesRemaining, 0);

  return {
    streaks,
    isLoading,
    error,
    refetch,
    getHabitStreak,
    totalCurrentStreak,
    activeStreaks,
    atRiskStreaks,
    totalFreezesRemaining,
  };
};

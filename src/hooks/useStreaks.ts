import { useQuery } from "@tanstack/react-query";
import { HabitsService } from "@/services/habitsService";
import { useAuth } from "@/contexts/AuthContext";

export const useStreaks = () => {
  const { user } = useAuth();

  const { data: streaks, isLoading } = useQuery({
    queryKey: ['user-streaks', user?.id],
    queryFn: () => HabitsService.getStreaks(),
    enabled: !!user,
  });

  return {
    streaks,
    isLoading,
    currentDailyStreak: streaks?.current_daily_streak || 0,
    longestDailyStreak: streaks?.longest_daily_streak || 0,
    currentWeeklyStreak: streaks?.current_weekly_streak || 0,
    longestWeeklyStreak: streaks?.longest_weekly_streak || 0,
  };
};

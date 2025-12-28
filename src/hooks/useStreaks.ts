import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HabitsService } from "@/services/habitsService";
import { useAuth } from "@/contexts/AuthContext";
import { offlineDataService } from "@/services/offlineDataService";

export const useStreaks = () => {
  const { user } = useAuth();
  const [isCached, setIsCached] = useState(false);

  const { data: streaks, isLoading } = useQuery({
    queryKey: ['user-streaks', user?.id],
    queryFn: async () => {
      try {
        const data = await HabitsService.getStreaks();
        // Cache for offline use
        if (data) {
          offlineDataService.cacheStreaks(data);
        }
        offlineDataService.updateLastSync();
        setIsCached(false);
        return data;
      } catch (err) {
        // If offline, try to get cached data
        if (!navigator.onLine) {
          const cached = await offlineDataService.getCachedStreaks();
          if (cached) {
            setIsCached(true);
            return cached;
          }
        }
        throw err;
      }
    },
    enabled: !!user,
  });

  return {
    streaks,
    isLoading,
    isCached,
    currentDailyStreak: streaks?.current_daily_streak || 0,
    longestDailyStreak: streaks?.longest_daily_streak || 0,
    currentWeeklyStreak: streaks?.current_weekly_streak || 0,
    longestWeeklyStreak: streaks?.longest_weekly_streak || 0,
  };
};

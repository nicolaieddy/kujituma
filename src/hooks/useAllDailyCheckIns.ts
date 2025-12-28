import { useQuery } from "@tanstack/react-query";
import { HabitsService } from "@/services/habitsService";
import { useAuth } from "@/contexts/AuthContext";

export const useAllDailyCheckIns = (limit: number = 30) => {
  const { user } = useAuth();

  const { data: checkIns, isLoading } = useQuery({
    queryKey: ['all-daily-check-ins', user?.id, limit],
    queryFn: () => HabitsService.getAllDailyCheckIns(limit),
    enabled: !!user,
  });

  // Calculate analytics
  const analytics = checkIns ? {
    totalCheckIns: checkIns.length,
    avgMood: checkIns.filter(c => c.mood_rating).reduce((sum, c) => sum + (c.mood_rating || 0), 0) / 
             (checkIns.filter(c => c.mood_rating).length || 1),
    avgEnergy: checkIns.filter(c => c.energy_level).reduce((sum, c) => sum + (c.energy_level || 0), 0) / 
               (checkIns.filter(c => c.energy_level).length || 1),
  } : null;

  return {
    checkIns: checkIns || [],
    analytics,
    isLoading,
  };
};

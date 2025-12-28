import { useQuery } from "@tanstack/react-query";
import { HabitsService } from "@/services/habitsService";
import { useAuth } from "@/contexts/AuthContext";

export const useAllWeeklyPlanningSessions = () => {
  const { user } = useAuth();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['all-weekly-planning-sessions', user?.id],
    queryFn: () => HabitsService.getAllWeeklyPlanningSessions(),
    enabled: !!user,
  });

  return {
    sessions: sessions || [],
    isLoading,
  };
};

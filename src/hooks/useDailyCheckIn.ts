import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HabitsService } from "@/services/habitsService";
import { useAuth } from "@/contexts/AuthContext";
import { CreateDailyCheckIn } from "@/types/habits";
import { toast } from "@/hooks/use-toast";

export const useDailyCheckIn = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: todayCheckIn, isLoading } = useQuery({
    queryKey: ['daily-check-in', user?.id],
    queryFn: () => HabitsService.getTodayCheckIn(),
    enabled: !!user,
  });

  const { data: recentCheckIns } = useQuery({
    queryKey: ['recent-check-ins', user?.id],
    queryFn: () => HabitsService.getRecentCheckIns(7),
    enabled: !!user,
  });

  const checkInMutation = useMutation({
    mutationFn: (data: CreateDailyCheckIn) => HabitsService.createOrUpdateCheckIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-check-in'] });
      queryClient.invalidateQueries({ queryKey: ['recent-check-ins'] });
      queryClient.invalidateQueries({ queryKey: ['user-streaks'] });
      toast({
        title: "Check-in complete! 🎯",
        description: "Great job showing up today!",
      });
    },
    onError: (error) => {
      console.error('Check-in error:', error);
      toast({
        title: "Error",
        description: "Failed to save check-in",
        variant: "destructive",
      });
    },
  });

  return {
    todayCheckIn,
    recentCheckIns,
    isLoading,
    hasCheckedInToday: !!todayCheckIn,
    submitCheckIn: checkInMutation.mutateAsync,
    isSubmitting: checkInMutation.isPending,
  };
};

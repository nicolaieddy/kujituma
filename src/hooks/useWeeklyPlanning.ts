import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HabitsService } from "@/services/habitsService";
import { useAuth } from "@/contexts/AuthContext";
import { CreateWeeklyPlanningSession } from "@/types/habits";
import { toast } from "@/hooks/use-toast";

export const useWeeklyPlanning = (weekStart: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: planningSession, isLoading } = useQuery({
    queryKey: ['weekly-planning', user?.id, weekStart],
    queryFn: () => HabitsService.getWeeklyPlanningSession(weekStart),
    enabled: !!user && !!weekStart,
  });

  const saveMutation = useMutation({
    mutationFn: (data: CreateWeeklyPlanningSession) => 
      HabitsService.createOrUpdatePlanningSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-planning'] });
    },
    onError: (error) => {
      console.error('Planning save error:', error);
      toast({
        title: "Error",
        description: "Failed to save planning session",
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => HabitsService.completePlanningSession(weekStart),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-planning'] });
      toast({
        title: "Planning complete! 📅",
        description: "You're ready to crush this week!",
      });
    },
    onError: (error) => {
      console.error('Planning complete error:', error);
    },
  });

  return {
    planningSession,
    isLoading,
    hasCompletedPlanning: planningSession?.is_completed || false,
    savePlanningSession: saveMutation.mutateAsync,
    completePlanningSession: completeMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isCompleting: completeMutation.isPending,
  };
};

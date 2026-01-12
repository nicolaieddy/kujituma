import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface CarryOverInput {
  objectiveId: string;
  targetWeek: string;
}

export interface DismissedObjective {
  id: string;
  objective_text: string;
  goal_id: string | null;
  dismissed_at: string;
}

export const useCarryOverObjectives = (
  currentWeekStart: string,
  goals?: { id: string; title: string }[]
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: incompleteObjectives = [], isLoading, error } = useQuery({
    queryKey: ['incomplete-objectives', user?.id, currentWeekStart],
    queryFn: () => WeeklyProgressService.getIncompleteObjectivesFromPreviousWeeks(currentWeekStart),
    enabled: !!user && !!currentWeekStart,
    retry: (failureCount, error) => {
      console.error('Incomplete objectives query failed:', error);
      return failureCount < 2;
    }
  });

  const { data: dismissedObjectives = [], isLoading: isLoadingDismissed } = useQuery({
    queryKey: ['dismissed-carryover-objectives', user?.id],
    queryFn: () => WeeklyProgressService.getDismissedCarryOverObjectives(),
    enabled: !!user,
  });

  const carryOverMutation = useMutation({
    mutationFn: (objectivesWithWeeks: CarryOverInput[]) =>
      WeeklyProgressService.carryOverObjectivesWithTargets(objectivesWithWeeks, goals),
    onSuccess: (newObjectives, variables) => {
      // Get unique target weeks and invalidate each
      const targetWeeks = new Set(variables.map(v => v.targetWeek));
      targetWeeks.forEach(week => {
        queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, week] });
      });
      // Also invalidate incomplete objectives since they're now duplicated
      queryClient.invalidateQueries({ queryKey: ['incomplete-objectives', user?.id, currentWeekStart] });
      // Invalidate all weekly objectives to ensure fresh data everywhere
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives'] });
      // Invalidate carry-over logs
      queryClient.invalidateQueries({ queryKey: ['carry-over-logs'] });
      
      console.log('[useCarryOverObjectives] Carried over objectives:', newObjectives);
      
      toast({
        title: "Success",
        description: `${newObjectives.length} objective${newObjectives.length !== 1 ? 's' : ''} carried over successfully!`,
      });
    },
    onError: (error) => {
      console.error('[useCarryOverObjectives] Error carrying over objectives:', error);
      toast({
        title: "Error",
        description: "Failed to carry over objectives. Please try again.",
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: ({ objectiveText, goalId }: { objectiveText: string; goalId: string | null }) =>
      WeeklyProgressService.dismissObjectiveFromCarryOver(objectiveText, goalId),
    onSuccess: () => {
      // Invalidate incomplete objectives to remove the dismissed one from the list
      queryClient.invalidateQueries({ queryKey: ['incomplete-objectives', user?.id, currentWeekStart] });
      // Also invalidate dismissed list
      queryClient.invalidateQueries({ queryKey: ['dismissed-carryover-objectives', user?.id] });
      
      toast({
        title: "Objective hidden",
        description: "This objective won't appear in carry-over suggestions anymore.",
      });
    },
    onError: (error) => {
      console.error('[useCarryOverObjectives] Error dismissing objective:', error);
      toast({
        title: "Error",
        description: "Failed to dismiss objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: ({ objectiveText, goalId }: { objectiveText: string; goalId: string | null }) =>
      WeeklyProgressService.undismissObjectiveFromCarryOver(objectiveText, goalId),
    onSuccess: () => {
      // Invalidate both lists
      queryClient.invalidateQueries({ queryKey: ['incomplete-objectives', user?.id, currentWeekStart] });
      queryClient.invalidateQueries({ queryKey: ['dismissed-carryover-objectives', user?.id] });
      
      toast({
        title: "Objective restored",
        description: "This objective will now appear in carry-over suggestions.",
      });
    },
    onError: (error) => {
      console.error('[useCarryOverObjectives] Error restoring objective:', error);
      toast({
        title: "Error",
        description: "Failed to restore objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  const carryOverObjectives = (objectivesWithWeeks: CarryOverInput[]) => {
    carryOverMutation.mutate(objectivesWithWeeks);
  };

  const carryOverObjectivesAsync = (objectivesWithWeeks: CarryOverInput[]) => {
    return carryOverMutation.mutateAsync(objectivesWithWeeks);
  };

  const dismissObjective = (objectiveText: string, goalId: string | null) => {
    dismissMutation.mutate({ objectiveText, goalId });
  };

  const restoreObjective = (objectiveText: string, goalId: string | null) => {
    restoreMutation.mutate({ objectiveText, goalId });
  };

  return {
    incompleteObjectives,
    isLoading,
    error,
    carryOverObjectives,
    carryOverObjectivesAsync,
    isCarryingOver: carryOverMutation.isPending,
    dismissObjective,
    isDismissing: dismissMutation.isPending,
    dismissedObjectives,
    isLoadingDismissed,
    restoreObjective,
    isRestoring: restoreMutation.isPending,
  };
};
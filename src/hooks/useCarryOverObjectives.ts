import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useCarryOverObjectives = (currentWeekStart: string) => {
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

  const carryOverMutation = useMutation({
    mutationFn: ({ objectiveIds, newWeekStart }: { objectiveIds: string[]; newWeekStart: string }) =>
      WeeklyProgressService.carryOverObjectives(objectiveIds, newWeekStart),
    onSuccess: (newObjectives, variables) => {
      // Invalidate the target week (where objectives were carried to)
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, variables.newWeekStart] });
      // Also invalidate incomplete objectives since they're now duplicated
      queryClient.invalidateQueries({ queryKey: ['incomplete-objectives', user?.id, currentWeekStart] });
      // Invalidate all weekly objectives to ensure fresh data everywhere
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives'] });
      
      console.log('[useCarryOverObjectives] Carried over to:', variables.newWeekStart, 'New objectives:', newObjectives);
      
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

  const carryOverObjectives = (objectiveIds: string[]) => {
    carryOverMutation.mutate({ objectiveIds, newWeekStart: currentWeekStart });
  };

  return {
    incompleteObjectives,
    isLoading,
    error,
    carryOverObjectives,
    isCarryingOver: carryOverMutation.isPending,
  };
};
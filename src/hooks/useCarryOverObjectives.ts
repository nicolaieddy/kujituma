import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface CarryOverInput {
  objectiveId: string;
  targetWeek: string;
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

  const carryOverObjectives = (objectivesWithWeeks: CarryOverInput[]) => {
    carryOverMutation.mutate(objectivesWithWeeks);
  };

  const carryOverObjectivesAsync = (objectivesWithWeeks: CarryOverInput[]) => {
    return carryOverMutation.mutateAsync(objectivesWithWeeks);
  };

  return {
    incompleteObjectives,
    isLoading,
    error,
    carryOverObjectives,
    carryOverObjectivesAsync,
    isCarryingOver: carryOverMutation.isPending,
  };
};
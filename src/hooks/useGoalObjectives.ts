import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { GoalsService } from "@/services/goalsService";
import { WeeklyObjective, CreateWeeklyObjectiveData, UpdateWeeklyObjectiveData } from "@/types/weeklyProgress";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useGoalObjectives = (goalId?: string, goalStartDate?: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasAutoExpandedRef = useRef(false);

  // Fetch ALL objectives for this specific goal (no date limit)
  const { data: goalObjectives = [], isLoading, refetch } = useQuery({
    queryKey: ['goal-objectives', goalId],
    queryFn: async () => {
      if (!goalId) return [];
      return WeeklyProgressService.getObjectivesForGoal(goalId);
    },
    enabled: !!user && !!goalId,
  });

  // Find the earliest objective date
  const earliestObjectiveDate = goalObjectives.length > 0
    ? goalObjectives.reduce((earliest, obj) => 
        obj.week_start < earliest ? obj.week_start : earliest, 
        goalObjectives[0].week_start
      )
    : null;

  // Check if we need to auto-expand the goal's start date
  const needsStartDateExpansion = goalStartDate && earliestObjectiveDate 
    ? earliestObjectiveDate < goalStartDate 
    : false;

  // Auto-expand goal start date on load if needed (run once per goal)
  useEffect(() => {
    if (
      needsStartDateExpansion && 
      goalId && 
      earliestObjectiveDate && 
      !hasAutoExpandedRef.current
    ) {
      hasAutoExpandedRef.current = true;
      GoalsService.updateGoal(goalId, { start_date: earliestObjectiveDate })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['goals'] });
          toast({
            title: "Goal updated",
            description: "Start date adjusted to include all objectives.",
          });
        })
        .catch((error) => {
          console.error('Error auto-expanding goal start date:', error);
        });
    }
  }, [needsStartDateExpansion, goalId, earliestObjectiveDate, queryClient]);

  // Reset the ref when goalId changes
  useEffect(() => {
    hasAutoExpandedRef.current = false;
  }, [goalId]);

  const createObjectiveMutation = useMutation({
    mutationFn: async (data: CreateWeeklyObjectiveData) => {
      const objective = await WeeklyProgressService.createWeeklyObjective(data);
      
      // Auto-expand goal start_date if the new objective is earlier
      if (data.goal_id && goalStartDate && data.week_start < goalStartDate) {
        await GoalsService.updateGoal(data.goal_id, { start_date: data.week_start });
      }
      
      return objective;
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch immediately
      queryClient.invalidateQueries({ queryKey: ['goal-objectives', goalId] });
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives'] });
      
      // Also invalidate goals if we might have updated start date
      if (variables.goal_id && goalStartDate && variables.week_start < goalStartDate) {
        queryClient.invalidateQueries({ queryKey: ['goals'] });
      }
      
      toast({
        title: "Success",
        description: "Objective added!",
      });
    },
    onError: (error) => {
      console.error('Error creating objective:', error);
      toast({
        title: "Error",
        description: "Failed to create objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateObjectiveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWeeklyObjectiveData }) => {
      const objective = await WeeklyProgressService.updateWeeklyObjective(id, data);
      
      // Auto-expand goal start_date if moving objective to an earlier week
      if (goalId && goalStartDate && data.week_start && data.week_start < goalStartDate) {
        await GoalsService.updateGoal(goalId, { start_date: data.week_start });
        queryClient.invalidateQueries({ queryKey: ['goals'] });
      }
      
      return objective;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-objectives', goalId] });
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives'] });
      toast({
        title: "Success",
        description: "Weekly objective updated successfully!",
      });
    },
    onError: (error) => {
      console.error('Error updating objective:', error);
      toast({
        title: "Error",
        description: "Failed to update objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteObjectiveMutation = useMutation({
    mutationFn: WeeklyProgressService.deleteWeeklyObjective,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-objectives', goalId] });
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives'] });
      toast({
        title: "Success",
        description: "Weekly objective deleted successfully!",
      });
    },
    onError: (error) => {
      console.error('Error deleting objective:', error);
      toast({
        title: "Error",
        description: "Failed to delete objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createObjective = (goalId: string, text: string, weekStart?: string) => {
    const targetWeekStart = weekStart || WeeklyProgressService.getWeekStart();
    createObjectiveMutation.mutate({
      goal_id: goalId,
      text,
      week_start: targetWeekStart,
    });
  };

  const updateObjective = (id: string, data: UpdateWeeklyObjectiveData) => {
    updateObjectiveMutation.mutate({ id, data });
  };

  const deleteObjective = (id: string) => {
    deleteObjectiveMutation.mutate(id);
  };

  // Manual expand goal start date if needed
  const expandGoalStartDate = useCallback(async () => {
    if (goalId && earliestObjectiveDate && needsStartDateExpansion) {
      await GoalsService.updateGoal(goalId, { start_date: earliestObjectiveDate });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: "Goal updated",
        description: "Start date adjusted to include all objectives.",
      });
    }
  }, [goalId, earliestObjectiveDate, needsStartDateExpansion, queryClient]);

  return {
    objectives: goalObjectives,
    isLoading,
    refetch,
    createObjective,
    updateObjective,
    deleteObjective,
    isCreating: createObjectiveMutation.isPending,
    isUpdating: updateObjectiveMutation.isPending,
    isDeleting: deleteObjectiveMutation.isPending,
    earliestObjectiveDate,
    needsStartDateExpansion,
    expandGoalStartDate,
  };
};
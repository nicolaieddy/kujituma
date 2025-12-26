import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { RecurringObjectivesService } from "@/services/recurringObjectivesService";
import { HabitStreaksService } from "@/services/habitStreaksService";
import { CreateWeeklyObjectiveData, UpdateWeeklyObjectiveData } from "@/types/weeklyProgress";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";
import { celebrateStreakMilestone, getStreakMilestoneMessage } from "@/utils/confetti";

export const useWeeklyObjectives = (currentWeekStart: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasGeneratedRef = useRef<string | null>(null);

  // Generate recurring objectives when week changes
  useEffect(() => {
    const generateRecurringObjectives = async () => {
      if (!user || !currentWeekStart) return;
      
      // Only generate once per week to avoid duplicates
      if (hasGeneratedRef.current === currentWeekStart) return;
      hasGeneratedRef.current = currentWeekStart;

      try {
        const created = await RecurringObjectivesService.generateRecurringObjectivesForWeek(currentWeekStart);
        if (created > 0) {
          // Invalidate to refresh the list with new objectives
          queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
        }
      } catch (error) {
        console.error('Error generating recurring objectives:', error);
      }
    };

    generateRecurringObjectives();
  }, [user, currentWeekStart, queryClient]);

  const { data: objectives = [], isLoading: objectivesLoading, error: objectivesError } = useQuery({
    queryKey: ['weekly-objectives', user?.id, currentWeekStart],
    queryFn: () => WeeklyProgressService.getWeeklyObjectives(currentWeekStart),
    enabled: !!user && !!currentWeekStart,
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: 1,
  });

  const createObjectiveMutation = useMutation({
    mutationFn: WeeklyProgressService.createWeeklyObjective,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
      toast({
        title: "Success",
        description: "Objective created successfully!",
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
    mutationFn: ({ id, data }: { id: string; data: UpdateWeeklyObjectiveData }) =>
      WeeklyProgressService.updateWeeklyObjective(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });

      // Snapshot previous value
      const previousObjectives = queryClient.getQueryData(['weekly-objectives', user?.id, currentWeekStart]);

      // Optimistically update the cache
      queryClient.setQueryData(['weekly-objectives', user?.id, currentWeekStart], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map(obj => obj.id === id ? { ...obj, ...data } : obj);
      });

      return { previousObjectives };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousObjectives) {
        queryClient.setQueryData(['weekly-objectives', user?.id, currentWeekStart], context.previousObjectives);
      }
      console.error('Error updating objective:', error);
      toast({
        title: "Error",
        description: "Failed to update objective. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
    },
  });

  const deleteObjectiveMutation = useMutation({
    mutationFn: WeeklyProgressService.deleteWeeklyObjective,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
      toast({
        title: "Success",
        description: "Objective deleted successfully!",
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

  const deleteAllObjectivesMutation = useMutation({
    mutationFn: WeeklyProgressService.deleteAllWeeklyObjectives,
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
      toast({
        title: "Success",
        description: `${deletedCount} objective${deletedCount !== 1 ? 's' : ''} cleared successfully!`,
      });
    },
    onError: (error) => {
      console.error('Error deleting all objectives:', error);
      toast({
        title: "Error",
        description: "Failed to clear objectives. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createObjective = (data: CreateWeeklyObjectiveData) => {
    createObjectiveMutation.mutate({ ...data, week_start: currentWeekStart });
  };

  const updateObjective = async (id: string, data: UpdateWeeklyObjectiveData) => {
    // Check for streak milestone before completing
    if (data.is_completed === true) {
      try {
        const milestoneCheck = await HabitStreaksService.checkStreakMilestone(id);
        if (milestoneCheck?.isMilestone) {
          // Delay celebration slightly to let the UI update first
          setTimeout(() => {
            celebrateStreakMilestone(milestoneCheck.newStreak);
            const message = getStreakMilestoneMessage(milestoneCheck.newStreak);
            if (message) {
              toast({
                title: "Streak Milestone!",
                description: message,
              });
            }
          }, 300);
        }
      } catch (error) {
        console.error('Error checking streak milestone:', error);
      }
    }
    updateObjectiveMutation.mutate({ id, data });
  };

  const deleteObjective = (id: string) => {
    deleteObjectiveMutation.mutate(id);
  };

  const deleteAllObjectives = () => {
    deleteAllObjectivesMutation.mutate(currentWeekStart);
  };

  return {
    objectives,
    isLoading: objectivesLoading,
    error: objectivesError,
    createObjective,
    updateObjective,
    deleteObjective,
    deleteAllObjectives,
    isCreating: createObjectiveMutation.isPending,
    isUpdating: updateObjectiveMutation.isPending,
    isDeleting: deleteObjectiveMutation.isPending,
    isDeletingAll: deleteAllObjectivesMutation.isPending,
  };
};
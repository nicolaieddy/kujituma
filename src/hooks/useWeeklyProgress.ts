
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { WeeklyObjective, WeeklyProgressPost, CreateWeeklyObjectiveData, UpdateWeeklyObjectiveData } from "@/types/weeklyProgress";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useWeeklyProgress = (weekStart?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Single source of truth for current week
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(
    weekStart || WeeklyProgressService.getWeekStart()
  );

  // Update current week when prop changes
  useEffect(() => {
    if (weekStart && weekStart !== currentWeekStart) {
      console.log('useWeeklyProgress: prop changed, updating week from', currentWeekStart, 'to', weekStart);
      setCurrentWeekStart(weekStart);
    }
  }, [weekStart]);

  const { data: objectives = [], isLoading: objectivesLoading, error: objectivesError } = useQuery({
    queryKey: ['weekly-objectives', user?.id, currentWeekStart],
    queryFn: async () => {
      console.log('Fetching objectives for user:', user?.id, 'week:', currentWeekStart);
      return WeeklyProgressService.getWeeklyObjectives(currentWeekStart);
    },
    enabled: !!user && !!currentWeekStart,
    retry: (failureCount, error) => {
      console.error('Objectives query failed:', error);
      return failureCount < 2;
    }
  });

  const { data: progressPost = null, isLoading: progressPostLoading, error: progressPostError } = useQuery({
    queryKey: ['weekly-progress-post', user?.id, currentWeekStart],
    queryFn: async () => {
      console.log('Fetching progress post for user:', user?.id, 'week:', currentWeekStart);
      return WeeklyProgressService.getWeeklyProgressPost(currentWeekStart);
    },
    enabled: !!user && !!currentWeekStart,
    retry: (failureCount, error) => {
      console.error('Progress post query failed:', error);
      return failureCount < 2;
    }
  });

  const createObjectiveMutation = useMutation({
    mutationFn: WeeklyProgressService.createWeeklyObjective,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives'] });
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
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives'] });
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

  const updateProgressPostMutation = useMutation({
    mutationFn: ({ weekStart, notes }: { weekStart: string; notes: string }) =>
      WeeklyProgressService.upsertWeeklyProgressPost(weekStart, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-progress-post'] });
      toast({
        title: "Success",
        description: "Progress notes saved successfully!",
      });
    },
    onError: (error) => {
      console.error('Error updating progress post:', error);
      toast({
        title: "Error",
        description: "Failed to save progress notes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const completeWeekMutation = useMutation({
    mutationFn: WeeklyProgressService.completeWeek,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-progress-post'] });
      toast({
        title: "Success",
        description: "Week completed successfully!",
      });
    },
    onError: (error) => {
      console.error('Error completing week:', error);
      toast({
        title: "Error",
        description: "Failed to complete week. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uncompleteWeekMutation = useMutation({
    mutationFn: WeeklyProgressService.uncompleteWeek,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-progress-post'] });
      toast({
        title: "Success",
        description: "Week reopened for editing!",
      });
    },
    onError: (error) => {
      console.error('Error uncompleting week:', error);
      toast({
        title: "Error",
        description: "Failed to reopen week. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createObjective = (data: CreateWeeklyObjectiveData) => {
    createObjectiveMutation.mutate({ ...data, week_start: currentWeekStart });
  };

  const updateObjective = (id: string, data: UpdateWeeklyObjectiveData) => {
    updateObjectiveMutation.mutate({ id, data });
  };

  const deleteObjective = (id: string) => {
    deleteObjectiveMutation.mutate(id);
  };

  const updateProgressNotes = (notes: string) => {
    updateProgressPostMutation.mutate({ weekStart: currentWeekStart, notes });
  };

  const completeWeek = () => {
    completeWeekMutation.mutate(currentWeekStart);
  };

  const uncompleteWeek = () => {
    uncompleteWeekMutation.mutate(currentWeekStart);
  };

  return {
    objectives,
    progressPost,
    isLoading: objectivesLoading || progressPostLoading,
    createObjective,
    updateObjective,
    deleteObjective,
    updateProgressNotes,
    completeWeek,
    uncompleteWeek,
    weekStart: currentWeekStart,
    weekRange: WeeklyProgressService.formatWeekRange(currentWeekStart),
    weekNumber: WeeklyProgressService.getWeekNumber(currentWeekStart),
    isCreating: createObjectiveMutation.isPending,
    isUpdating: updateObjectiveMutation.isPending,
    isDeleting: deleteObjectiveMutation.isPending,
    isSavingNotes: updateProgressPostMutation.isPending,
    isCompletingWeek: completeWeekMutation.isPending,
    isUncompletingWeek: uncompleteWeekMutation.isPending,
  };
};

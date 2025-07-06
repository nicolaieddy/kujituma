import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { WeeklyObjective, CreateWeeklyObjectiveData, UpdateWeeklyObjectiveData } from "@/types/weeklyProgress";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useGoalObjectives = (goalId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get all weekly objectives (for the current user)
  const { data: allObjectives = [], isLoading } = useQuery({
    queryKey: ['weekly-objectives', user?.id],
    queryFn: async () => {
      // We need to fetch objectives for multiple weeks
      // For now, let's get the current week and a few weeks back
      const weeks = [];
      const currentDate = new Date();
      
      // Get current week and previous 12 weeks
      for (let i = 0; i < 13; i++) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - (i * 7));
        weeks.push(WeeklyProgressService.getWeekStart(date));
      }

      const allWeekObjectives = await Promise.all(
        weeks.map(week => 
          WeeklyProgressService.getWeeklyObjectives(week).catch(() => [])
        )
      );

      return allWeekObjectives.flat();
    },
    enabled: !!user,
  });

  // Filter objectives by goal if goalId is provided
  const goalObjectives = goalId 
    ? allObjectives.filter(obj => obj.goal_id === goalId)
    : allObjectives;

  const createObjectiveMutation = useMutation({
    mutationFn: (data: CreateWeeklyObjectiveData) =>
      WeeklyProgressService.createWeeklyObjective(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives'] });
      toast({
        title: "Success",
        description: "Weekly objective created successfully!",
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

  const createObjective = (goalId: string, text: string) => {
    const currentWeekStart = WeeklyProgressService.getWeekStart();
    createObjectiveMutation.mutate({
      goal_id: goalId,
      text,
      week_start: currentWeekStart,
    });
  };

  const updateObjective = (id: string, data: UpdateWeeklyObjectiveData) => {
    updateObjectiveMutation.mutate({ id, data });
  };

  const deleteObjective = (id: string) => {
    deleteObjectiveMutation.mutate(id);
  };

  return {
    objectives: goalObjectives,
    allObjectives,
    isLoading,
    createObjective,
    updateObjective,
    deleteObjective,
    isCreating: createObjectiveMutation.isPending,
    isUpdating: updateObjectiveMutation.isPending,
    isDeleting: deleteObjectiveMutation.isPending,
  };
};
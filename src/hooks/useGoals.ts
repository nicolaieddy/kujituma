
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GoalsService } from "@/services/goalsService";
import { Goal, CreateGoalData, UpdateGoalData } from "@/types/goals";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useGoals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading, error } = useQuery({
    queryKey: ['goals', user?.id],
    queryFn: GoalsService.getGoals,
    enabled: !!user,
  });

  const createGoalMutation = useMutation({
    mutationFn: GoalsService.createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: "Success",
        description: "Goal created successfully!",
      });
    },
    onError: (error) => {
      console.error('Error creating goal:', error);
      toast({
        title: "Error",
        description: "Failed to create goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGoalData }) =>
      GoalsService.updateGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: "Success",
        description: "Goal updated successfully!",
      });
    },
    onError: (error) => {
      console.error('Error updating goal:', error);
      toast({
        title: "Error",
        description: "Failed to update goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: GoalsService.deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: "Success",
        description: "Goal deleted successfully!",
      });
    },
    onError: (error) => {
      console.error('Error deleting goal:', error);
      toast({
        title: "Error",
        description: "Failed to delete goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createGoal = (data: CreateGoalData) => {
    createGoalMutation.mutate(data);
  };

  const updateGoal = (id: string, data: UpdateGoalData) => {
    updateGoalMutation.mutate({ id, data });
  };

  const deleteGoal = (id: string) => {
    deleteGoalMutation.mutate(id);
  };

  const goalsByStatus = {
    not_started: goals.filter(goal => goal.status === 'not_started'),
    in_progress: goals.filter(goal => goal.status === 'in_progress'),
    completed: goals.filter(goal => goal.status === 'completed'),
  };

  return {
    goals,
    goalsByStatus,
    isLoading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending,
  };
};

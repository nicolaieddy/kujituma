
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

  const deprioritizeMutation = useMutation({
    mutationFn: GoalsService.deprioritizeGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: "Goal Deprioritized",
        description: "Goal moved to deprioritized section.",
      });
    },
    onError: (error) => {
      console.error('Error deprioritizing goal:', error);
      toast({
        title: "Error",
        description: "Failed to deprioritize goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reprioritizeMutation = useMutation({
    mutationFn: GoalsService.reprioritizeGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: "Goal Re-prioritized",
        description: "Goal moved back to active goals.",
      });
    },
    onError: (error) => {
      console.error('Error reprioritizing goal:', error);
      toast({
        title: "Error",
        description: "Failed to reprioritize goal. Please try again.",
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

  const deprioritizeGoal = (id: string) => {
    deprioritizeMutation.mutate(id);
  };

  const reprioritizeGoal = (id: string) => {
    reprioritizeMutation.mutate(id);
  };

  // Organize goals by status
  const activeGoals = goals.filter(goal => 
    goal.status === 'not_started' || goal.status === 'in_progress'
  );
  
  const deprioritizedGoals = goals.filter(goal => goal.status === 'deprioritized');
  
  const completedGoals = goals.filter(goal => goal.status === 'completed');

  // Group completed goals by year
  const completedGoalsByYear = completedGoals.reduce((acc, goal) => {
    const year = goal.completed_at 
      ? new Date(goal.completed_at).getFullYear() 
      : new Date(goal.created_at).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(goal);
    return acc;
  }, {} as Record<number, Goal[]>);

  // Get previous year goals that need carry-over consideration
  const currentYear = new Date().getFullYear();
  const previousYearUnfinishedGoals = goals.filter(goal => {
    const goalYear = new Date(goal.created_at).getFullYear();
    return goalYear < currentYear && 
           goal.status !== 'completed' && 
           goal.status !== 'deleted' &&
           goal.status !== 'deprioritized';
  });

  const goalsByStatus = {
    not_started: goals.filter(goal => goal.status === 'not_started'),
    in_progress: goals.filter(goal => goal.status === 'in_progress'),
    completed: goals.filter(goal => goal.status === 'completed'),
    deprioritized: goals.filter(goal => goal.status === 'deprioritized'),
  };

  return {
    goals,
    goalsByStatus,
    activeGoals,
    deprioritizedGoals,
    completedGoals,
    completedGoalsByYear,
    previousYearUnfinishedGoals,
    isLoading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    deprioritizeGoal,
    reprioritizeGoal,
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending,
    isDeprioritizing: deprioritizeMutation.isPending,
    isReprioritizing: reprioritizeMutation.isPending,
  };
};

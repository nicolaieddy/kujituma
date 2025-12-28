
import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GoalsService } from "@/services/goalsService";
import { RecurringObjectivesService } from "@/services/recurringObjectivesService";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { Goal, CreateGoalData, UpdateGoalData } from "@/types/goals";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { offlineDataService } from "@/services/offlineDataService";
import { offlineSyncService } from "@/services/offlineSyncService";

export const useGoals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCached, setIsCached] = useState(false);

  const { data: goals = [], isLoading, error } = useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      console.log('[useGoals] Fetching goals for user:', user?.id);
      try {
        const data = await GoalsService.getGoals();
        console.log('[useGoals] Fetched', data.length, 'goals');
        // Cache for offline use
        offlineDataService.cacheGoals(data);
        offlineDataService.updateLastSync();
        setIsCached(false);
        return data;
      } catch (err) {
        console.error('[useGoals] Error fetching goals:', err);
        // If offline, try to get cached data
        if (!navigator.onLine) {
          console.log('[useGoals] Offline, trying cached data');
          const cached = await offlineDataService.getCachedGoals();
          if (cached) {
            console.log('[useGoals] Using cached data:', cached.length, 'goals');
            setIsCached(true);
            return cached;
          }
        }
        throw err;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes - goals don't change often
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });
  
  // Log any query errors
  useEffect(() => {
    if (error) {
      console.error('[useGoals] Query error:', error);
    }
  }, [error]);

  const createGoalMutation = useMutation({
    mutationFn: GoalsService.createGoal,
    onSuccess: async (goal) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      
      // If it's a recurring goal, generate the objective for the current week immediately
      if (goal.is_recurring) {
        try {
          const currentWeekStart = WeeklyProgressService.getWeekStart();
          const created = await RecurringObjectivesService.createRecurringObjectiveIfNeeded(goal, currentWeekStart);
          if (created) {
            // Invalidate weekly objectives to show the new recurring objective
            queryClient.invalidateQueries({ queryKey: ['weekly-objectives'] });
          }
        } catch (error) {
          console.error('Error creating recurring objective:', error);
        }
      }
      
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
    onSuccess: async (goal) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      
      // If it's a recurring goal, ensure objective exists for current week
      if (goal.is_recurring) {
        try {
          const currentWeekStart = WeeklyProgressService.getWeekStart();
          const created = await RecurringObjectivesService.createRecurringObjectiveIfNeeded(goal, currentWeekStart);
          if (created) {
            // Invalidate weekly objectives to show the new recurring objective
            queryClient.invalidateQueries({ queryKey: ['weekly-objectives'] });
          }
        } catch (error) {
          console.error('Error creating recurring objective:', error);
        }
      }
      
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

  const reorderGoalMutation = useMutation({
    mutationFn: (reorderedGoals: { id: string; order_index: number }[]) =>
      GoalsService.reorderGoals(reorderedGoals),
    onMutate: async (reorderedGoals) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['goals', user?.id] });

      // Snapshot the previous value
      const previousGoals = queryClient.getQueryData<Goal[]>(['goals', user?.id]);

      // Optimistically update the cache with new order
      if (previousGoals) {
        const orderMap = new Map(reorderedGoals.map(g => [g.id, g.order_index]));
        const updatedGoals = previousGoals.map(goal => {
          const newIndex = orderMap.get(goal.id);
          return newIndex !== undefined ? { ...goal, order_index: newIndex } : goal;
        });
        // Sort by order_index to reflect new order
        updatedGoals.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
        queryClient.setQueryData(['goals', user?.id], updatedGoals);
      }

      return { previousGoals };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousGoals) {
        queryClient.setQueryData(['goals', user?.id], context.previousGoals);
      }
      console.error('Error reordering goals:', error);
      toast({
        title: "Error",
        description: "Failed to reorder goals. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch after mutation settles to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ['goals', user?.id] });
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

  const togglePauseGoal = (id: string, isPaused: boolean) => {
    updateGoalMutation.mutate({ 
      id, 
      data: { 
        is_paused: isPaused,
        paused_at: isPaused ? new Date().toISOString() : null
      } 
    });
    toast({
      title: isPaused ? "Habit paused" : "Habit resumed",
      description: isPaused 
        ? "No new objectives will be created until you resume." 
        : "Objectives will be created for upcoming weeks.",
    });
  };

  const reorderGoals = (reorderedGoals: { id: string; order_index: number }[]) => {
    reorderGoalMutation.mutate(reorderedGoals);
  };

  // Memoize goal organization to avoid recomputation on every render
  const { activeGoals, deprioritizedGoals, completedGoals, completedGoalsByYear, previousYearUnfinishedGoals, goalsByStatus } = useMemo(() => {
    const active = goals.filter(goal => 
      goal.status === 'not_started' || goal.status === 'in_progress'
    );
    
    const deprioritized = goals.filter(goal => goal.status === 'deprioritized');
    
    const completed = goals.filter(goal => goal.status === 'completed');

    // Group completed goals by year
    const completedByYear = completed.reduce((acc, goal) => {
      const year = goal.completed_at 
        ? new Date(goal.completed_at).getFullYear() 
        : new Date(goal.created_at).getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(goal);
      return acc;
    }, {} as Record<number, Goal[]>);

    // Get previous year goals that need carry-over consideration
    const currentYear = new Date().getFullYear();
    const previousUnfinished = goals.filter(goal => {
      const goalYear = new Date(goal.created_at).getFullYear();
      return goalYear < currentYear && 
             goal.status !== 'completed' && 
             goal.status !== 'deleted' &&
             goal.status !== 'deprioritized';
    });

    const byStatus = {
      not_started: goals.filter(goal => goal.status === 'not_started'),
      in_progress: goals.filter(goal => goal.status === 'in_progress'),
      completed: completed,
      deprioritized: deprioritized,
    };

    return {
      activeGoals: active,
      deprioritizedGoals: deprioritized,
      completedGoals: completed,
      completedGoalsByYear: completedByYear,
      previousYearUnfinishedGoals: previousUnfinished,
      goalsByStatus: byStatus
    };
  }, [goals]);

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
    isCached,
    createGoal,
    updateGoal,
    deleteGoal,
    deprioritizeGoal,
    reprioritizeGoal,
    togglePauseGoal,
    reorderGoals,
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending,
    isDeprioritizing: deprioritizeMutation.isPending,
    isReprioritizing: reprioritizeMutation.isPending,
    isReordering: reorderGoalMutation.isPending,
  };
};

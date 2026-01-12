import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { HabitCompletionsService } from "@/services/habitCompletionsService";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useRealtimeHabits } from "@/hooks/useRealtimeHabits";
import { HabitCompletion } from "@/types/goals";
import { WeeklyProgressService } from "@/services/weeklyProgressService";

export const useHabitCompletions = (weekStart?: Date) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Use WeeklyProgressService for consistent Monday-based week calculation
  const weekKey = weekStart 
    ? WeeklyProgressService.getWeekStart(weekStart) 
    : WeeklyProgressService.getWeekStart();
  
  // Parse weekKey back to Date for downstream usage
  const [year, month, day] = weekKey.split('-').map(Number);
  const currentWeekStart = new Date(year, month - 1, day);

  // Subscribe to real-time habit completion changes
  useRealtimeHabits(weekKey);

  const { data: completions = [], isLoading } = useQuery({
    queryKey: ["habit-completions", user?.id, weekKey],
    queryFn: () => HabitCompletionsService.getWeekCompletions(currentWeekStart),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      goalId,
      habitItemId,
      date,
    }: {
      goalId: string;
      habitItemId: string;
      date: Date;
    }) => HabitCompletionsService.toggleCompletion(goalId, habitItemId, date),
    onMutate: async ({ goalId, habitItemId, date }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["habit-completions", user?.id, weekKey] });
      
      // Snapshot the previous value
      const previousCompletions = queryClient.getQueryData<HabitCompletion[]>(["habit-completions", user?.id, weekKey]);
      
      // Optimistically update
      const dateStr = format(date, "yyyy-MM-dd");
      queryClient.setQueryData<HabitCompletion[]>(["habit-completions", user?.id, weekKey], (old) => {
        if (!old) return old;
        
        const existingIndex = old.findIndex(
          c => c.habit_item_id === habitItemId && c.completion_date === dateStr
        );
        
        if (existingIndex >= 0) {
          // Remove the completion (toggle off)
          return old.filter((_, i) => i !== existingIndex);
        } else {
          // Add the completion (toggle on)
          return [...old, {
            id: `temp-${Date.now()}`,
            goal_id: goalId,
            habit_item_id: habitItemId,
            completion_date: dateStr,
            user_id: user?.id || '',
            created_at: new Date().toISOString()
          }];
        }
      });
      
      return { previousCompletions };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousCompletions) {
        queryClient.setQueryData(["habit-completions", user?.id, weekKey], context.previousCompletions);
      }
      console.error("Error toggling habit completion:", error);
      toast({
        title: "Error",
        description: "Failed to update habit completion",
        variant: "destructive",
      });
    },
    onSuccess: (isCompleted, { goalId, habitItemId, date }) => {
      // After successful mutation, update cache with the correct state
      // This ensures the server's response is reflected accurately
      const dateStr = format(date, "yyyy-MM-dd");
      
      queryClient.setQueryData<HabitCompletion[]>(["habit-completions", user?.id, weekKey], (old) => {
        if (!old) return old;
        
        const existingIndex = old.findIndex(
          c => c.habit_item_id === habitItemId && c.completion_date === dateStr
        );
        
        if (isCompleted) {
          // Should be completed - if not in list, add it
          if (existingIndex < 0) {
            return [...old, {
              id: `confirmed-${Date.now()}`,
              goal_id: goalId,
              habit_item_id: habitItemId,
              completion_date: dateStr,
              user_id: user?.id || '',
              created_at: new Date().toISOString()
            }];
          }
          // Already exists, update it to remove temp id
          return old.map((c, i) => 
            i === existingIndex ? { ...c, id: c.id.startsWith('temp-') ? `confirmed-${Date.now()}` : c.id } : c
          );
        } else {
          // Should not be completed - remove if exists
          if (existingIndex >= 0) {
            return old.filter((_, i) => i !== existingIndex);
          }
        }
        return old;
      });
      
      // Invalidate daily streaks so they recalculate
      queryClient.invalidateQueries({ queryKey: ["daily-streaks", user?.id] });
    },
    // Note: No onSettled invalidation - we rely on onSuccess + realtime for sync
  });

  const toggleCompletion = (
    goalId: string,
    habitItemId: string,
    date: Date
  ) => {
    toggleMutation.mutate({ goalId, habitItemId, date });
  };

  const getCompletionStatus = (habitItemId: string) => {
    return HabitCompletionsService.getWeeklyCompletionStatus(
      completions,
      habitItemId,
      currentWeekStart
    );
  };

  const weekDates = HabitCompletionsService.getWeekDates(currentWeekStart);

  return {
    completions,
    isLoading,
    toggleCompletion,
    getCompletionStatus,
    weekDates,
    isToggling: toggleMutation.isPending,
  };
};

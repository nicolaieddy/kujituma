import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { HabitCompletionsService } from "@/services/habitCompletionsService";
import { startOfWeek, format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useRealtimeHabits } from "@/hooks/useRealtimeHabits";

export const useHabitCompletions = (weekStart?: Date) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const currentWeekStart = weekStart || startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekKey = format(currentWeekStart, "yyyy-MM-dd");

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
      const previousCompletions = queryClient.getQueryData(["habit-completions", user?.id, weekKey]);
      
      // Optimistically update
      const dateStr = format(date, "yyyy-MM-dd");
      queryClient.setQueryData(["habit-completions", user?.id, weekKey], (old: any[] | undefined) => {
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
            user_id: user?.id,
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
    onSettled: () => {
      // Refetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ["habit-completions"] });
    },
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

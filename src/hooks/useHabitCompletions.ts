import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { HabitCompletionsService } from "@/services/habitCompletionsService";
import { startOfWeek, format } from "date-fns";
import { toast } from "@/hooks/use-toast";

export const useHabitCompletions = (weekStart?: Date) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const currentWeekStart = weekStart || startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekKey = format(currentWeekStart, "yyyy-MM-dd");

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
    onSuccess: (isCompleted) => {
      queryClient.invalidateQueries({ queryKey: ["habit-completions"] });
      // No toast for daily check - too noisy
    },
    onError: (error) => {
      console.error("Error toggling habit completion:", error);
      toast({
        title: "Error",
        description: "Failed to update habit completion",
        variant: "destructive",
      });
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

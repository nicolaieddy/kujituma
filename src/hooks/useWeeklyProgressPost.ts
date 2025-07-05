import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useWeeklyProgressPost = (currentWeekStart: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
    progressPost,
    isLoading: progressPostLoading,
    error: progressPostError,
    updateProgressNotes,
    completeWeek,
    uncompleteWeek,
    isSavingNotes: updateProgressPostMutation.isPending,
    isCompletingWeek: completeWeekMutation.isPending,
    isUncompletingWeek: uncompleteWeekMutation.isPending,
  };
};
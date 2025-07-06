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
      try {
        return await WeeklyProgressService.getWeeklyProgressPost(currentWeekStart);
      } catch (error) {
        console.error('Progress post query failed:', error);
        // Return null instead of throwing to prevent crashes
        return null;
      }
    },
    enabled: !!user && !!currentWeekStart,
    retry: (failureCount, error) => {
      console.error('Progress post query failed, attempt:', failureCount + 1, error);
      // Only retry on network errors, not on data integrity issues
      return failureCount < 1 && !error?.message?.includes('multiple');
    },
    staleTime: 5000, // Consider data fresh for 5 seconds
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const updateProgressPostMutation = useMutation({
    mutationFn: ({ weekStart, notes }: { weekStart: string; notes: string }) =>
      WeeklyProgressService.upsertWeeklyProgressPost(weekStart, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-progress-post'] });
      // Remove toast to prevent potential React crashes
      console.log('Progress notes saved successfully!');
    },
    onError: (error) => {
      console.error('Error updating progress post:', error);
      // Remove toast to prevent potential React crashes  
      console.error('Failed to save progress notes:', error);
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
    return updateProgressPostMutation.mutateAsync({ weekStart: currentWeekStart, notes });
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
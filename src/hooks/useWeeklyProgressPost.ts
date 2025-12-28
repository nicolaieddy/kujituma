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
      try {
        console.log('[useWeeklyProgressPost] Fetching for week:', currentWeekStart);
        const result = await WeeklyProgressService.getWeeklyProgressPost(currentWeekStart);
        console.log('[useWeeklyProgressPost] Result:', result ? 'found' : 'null');
        return result;
      } catch (err) {
        console.error('[useWeeklyProgressPost] Error fetching:', err);
        return null;
      }
    },
    enabled: !!user && !!currentWeekStart,
    retry: 1,
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
  });

  const updateProgressPostMutation = useMutation({
    mutationFn: ({ weekStart, notes }: { weekStart: string; notes: string }) =>
      WeeklyProgressService.upsertWeeklyProgressPost(weekStart, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-progress-post', user?.id, currentWeekStart] });
    },
    onError: (error) => {
      console.error('Error updating progress post:', error);
    },
  });

  const completeWeekMutation = useMutation({
    mutationFn: WeeklyProgressService.completeWeek,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-progress-post'] });
      toast({ title: "Success", description: "Week completed successfully!" });
    },
    onError: (error) => {
      console.error('Error completing week:', error);
      toast({ title: "Error", description: "Failed to complete week.", variant: "destructive" });
    },
  });

  const uncompleteWeekMutation = useMutation({
    mutationFn: WeeklyProgressService.uncompleteWeek,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-progress-post'] });
      toast({ title: "Success", description: "Week reopened for editing!" });
    },
    onError: (error) => {
      console.error('Error uncompleting week:', error);
      toast({ title: "Error", description: "Failed to reopen week.", variant: "destructive" });
    },
  });

  const updateProgressNotes = (notes: string) => {
    return updateProgressPostMutation.mutateAsync({ weekStart: currentWeekStart, notes });
  };

  return {
    progressPost,
    isLoading: progressPostLoading,
    error: progressPostError,
    updateProgressNotes,
    completeWeek: () => completeWeekMutation.mutate(currentWeekStart),
    uncompleteWeek: () => uncompleteWeekMutation.mutate(currentWeekStart),
    isSavingNotes: updateProgressPostMutation.isPending,
    isCompletingWeek: completeWeekMutation.isPending,
    isUncompletingWeek: uncompleteWeekMutation.isPending,
  };
};
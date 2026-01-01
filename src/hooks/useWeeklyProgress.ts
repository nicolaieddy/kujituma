
import { useWeekState } from "./useWeekState";
import { useWeeklyObjectives } from "./useWeeklyObjectives";
import { useWeeklyProgressPost } from "./useWeeklyProgressPost";
import { useWeeklyFeedPost } from "./useWeeklyFeedPost";

export const useWeeklyProgress = (weekStart?: string) => {
  // Use focused hooks for each concern
  const weekState = useWeekState(weekStart);
  const objectives = useWeeklyObjectives(weekState.weekStart);
  const progressPost = useWeeklyProgressPost(weekState.weekStart);
  const feedPost = useWeeklyFeedPost(weekState.weekStart);

  return {
    // Week state
    weekStart: weekState.weekStart,
    weekRange: weekState.weekRange,
    weekNumber: weekState.weekNumber,
    
    // Objectives
    objectives: objectives.objectives,
    createObjective: objectives.createObjective,
    updateObjective: objectives.updateObjective,
    deleteObjective: objectives.deleteObjective,
    deleteAllObjectives: objectives.deleteAllObjectives,
    isCreating: objectives.isCreating,
    isUpdating: objectives.isUpdating,
    isDeleting: objectives.isDeleting,
    isDeletingAll: objectives.isDeletingAll,
    
    // Sync status
    isCached: objectives.isCached,
    isRefetching: objectives.isRefetching,
    lastSyncTime: objectives.lastSyncTime,
    refetchObjectives: objectives.refetch,
    
    // Progress post
    progressPost: progressPost.progressPost,
    updateProgressNotes: progressPost.updateProgressNotes,
    completeWeek: progressPost.completeWeek,
    uncompleteWeek: progressPost.uncompleteWeek,
    isSavingNotes: progressPost.isSavingNotes,
    isCompletingWeek: progressPost.isCompletingWeek,
    isUncompletingWeek: progressPost.isUncompletingWeek,
    
    // Feed post
    feedPost: feedPost.feedPost,
    
    // Combined loading state
    isLoading: objectives.isLoading || progressPost.isLoading,
  };
};


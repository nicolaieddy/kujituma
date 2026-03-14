
import { useWeekState } from "./useWeekState";
import { useWeeklyObjectives } from "./useWeeklyObjectives";

export const useWeeklyProgress = (weekStart?: string) => {
  const weekState = useWeekState(weekStart);
  const objectives = useWeeklyObjectives(weekState.weekStart);

  // Get progress post from objectives query context if available
  const { data: progressPostData } = require("@tanstack/react-query").useQuery({
    queryKey: ['weekly-progress-post', weekState.weekStart],
    queryFn: async () => {
      const { WeeklyProgressService } = await import("@/services/weeklyProgressService");
      return WeeklyProgressService.getWeeklyProgressPost(weekState.weekStart);
    },
    enabled: !!weekState.weekStart,
  });

  return {
    weekStart: weekState.weekStart,
    weekRange: weekState.weekRange,
    weekNumber: weekState.weekNumber,
    
    objectives: objectives.objectives,
    createObjective: objectives.createObjective,
    updateObjective: objectives.updateObjective,
    deleteObjective: objectives.deleteObjective,
    deleteAllObjectives: objectives.deleteAllObjectives,
    reorderObjectives: objectives.reorderObjectives,
    isCreating: objectives.isCreating,
    isUpdating: objectives.isUpdating,
    isDeleting: objectives.isDeleting,
    isDeletingAll: objectives.isDeletingAll,
    pendingUpdateIds: objectives.pendingUpdateIds,
    recentlySavedIds: objectives.recentlySavedIds,
    
    isCached: objectives.isCached,
    isRefetching: objectives.isRefetching,
    lastSyncTime: objectives.lastSyncTime,
    refetchObjectives: objectives.refetch,
    
    progressPost: progressPostData || null,
    updateProgressNotes: async (notes: string) => {
      const { WeeklyProgressService } = await import("@/services/weeklyProgressService");
      await WeeklyProgressService.updateProgressNotes(weekState.weekStart, notes);
    },
    completeWeek: async () => {
      const { WeeklyProgressService } = await import("@/services/weeklyProgressService");
      await WeeklyProgressService.completeWeek(weekState.weekStart);
    },
    uncompleteWeek: async () => {
      const { WeeklyProgressService } = await import("@/services/weeklyProgressService");
      await WeeklyProgressService.uncompleteWeek(weekState.weekStart);
    },
    isSavingNotes: false,
    isCompletingWeek: false,
    isUncompletingWeek: false,
    
    feedPost: null,
    
    isLoading: objectives.isLoading,
  };
};

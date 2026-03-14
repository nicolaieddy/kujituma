
import { useWeekState } from "./useWeekState";
import { useWeeklyObjectives } from "./useWeeklyObjectives";
import { useQuery } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";

export const useWeeklyProgress = (weekStart?: string) => {
  const weekState = useWeekState(weekStart);
  const objectives = useWeeklyObjectives(weekState.weekStart);

  const { data: progressPostData, isLoading: progressLoading } = useQuery({
    queryKey: ['weekly-progress-post', weekState.weekStart],
    queryFn: () => WeeklyProgressService.getWeeklyProgressPost(weekState.weekStart),
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
      await WeeklyProgressService.upsertWeeklyProgressPost(weekState.weekStart, notes);
    },
    completeWeek: async () => {
      await WeeklyProgressService.completeWeek(weekState.weekStart);
    },
    uncompleteWeek: async () => {
      await WeeklyProgressService.uncompleteWeek(weekState.weekStart);
    },
    isSavingNotes: false,
    isCompletingWeek: false,
    isUncompletingWeek: false,
    
    feedPost: null,
    
    isLoading: objectives.isLoading || progressLoading,
  };
};

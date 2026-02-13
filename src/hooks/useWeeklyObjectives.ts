import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { HabitStreaksService } from "@/services/habitStreaksService";
import { CreateWeeklyObjectiveData, UpdateWeeklyObjectiveData } from "@/types/weeklyProgress";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { celebrateStreakMilestone, getStreakMilestoneMessage } from "@/utils/confetti";
import { offlineDataService } from "@/services/offlineDataService";
import { useRealtimeObjectives, useVisibilityRefresh } from "./useRealtimeObjectives";
import { useObjectiveMutations } from "./useObjectiveMutations";

export const useWeeklyObjectives = (currentWeekStart: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCached, setIsCached] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Enable real-time sync for objectives across devices
  useRealtimeObjectives(currentWeekStart);
  
  // Auto-refresh when app becomes visible after being in background
  useVisibilityRefresh(
    [['weekly-objectives', user?.id || '', currentWeekStart]],
    {
      staleThresholdMs: 30000,
      onRefresh: () => {
        console.log('[WeeklyObjectives] Refreshing due to visibility change');
      }
    }
  );

  const { data: objectives = [], isLoading: objectivesLoading, error: objectivesError, isRefetching } = useQuery({
    queryKey: ['weekly-objectives', user?.id, currentWeekStart],
    queryFn: async () => {
      try {
        const data = await WeeklyProgressService.getWeeklyObjectives(currentWeekStart);
        offlineDataService.cacheWeeklyObjectives(data, currentWeekStart);
        offlineDataService.updateLastSync();
        setIsCached(false);
        setLastSyncTime(new Date());
        return data;
      } catch (err) {
        if (!navigator.onLine) {
          const cached = await offlineDataService.getCachedWeeklyObjectives(currentWeekStart);
          if (cached) {
            setIsCached(true);
            return cached;
          }
        }
        throw err;
      }
    },
    enabled: !!user && !!currentWeekStart,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });

  // Use extracted mutations
  const { 
    createMutation, 
    updateMutation, 
    deleteMutation, 
    reorderMutation,
    deleteAllMutation,
    pendingUpdateIds,
    recentlySavedIds,
  } = useObjectiveMutations({
    userId: user?.id,
    currentWeekStart,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
  };

  const createObjective = (data: CreateWeeklyObjectiveData) => {
    createMutation.mutate({ ...data, week_start: currentWeekStart });
  };

  const updateObjective = (id: string, data: UpdateWeeklyObjectiveData) => {
    // Trigger mutation immediately for responsive UI
    updateMutation.mutate({ id, data });
    
    // Check for streak milestone asynchronously after completing
    if (data.is_completed === true) {
      HabitStreaksService.checkStreakMilestone(id)
        .then((milestoneCheck) => {
          if (milestoneCheck?.isMilestone) {
            setTimeout(() => {
              celebrateStreakMilestone(milestoneCheck.newStreak);
              const message = getStreakMilestoneMessage(milestoneCheck.newStreak);
              if (message) {
                toast({
                  title: "Streak Milestone!",
                  description: message,
                });
              }
            }, 300);
          }
        })
        .catch((error) => {
          console.error('Error checking streak milestone:', error);
        });
    }
  };

  const deleteObjective = (id: string) => {
    deleteMutation.mutate(id);
  };

  const deleteAllObjectives = () => {
    deleteAllMutation.mutate(currentWeekStart);
  };

  const reorderObjectives = (updates: { id: string; order_index: number }[]) => {
    reorderMutation.mutate(updates);
  };

  return {
    objectives,
    isLoading: objectivesLoading,
    error: objectivesError,
    isCached,
    isRefetching,
    lastSyncTime,
    refetch,
    createObjective,
    updateObjective,
    deleteObjective,
    deleteAllObjectives,
    reorderObjectives,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDeletingAll: deleteAllMutation.isPending,
    pendingUpdateIds,
    recentlySavedIds,
  };
};

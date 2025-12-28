import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HabitsService } from "@/services/habitsService";
import { useAuth } from "@/contexts/AuthContext";
import { CreateWeeklyPlanningSession } from "@/types/habits";
import { toast } from "@/hooks/use-toast";
import { offlineDataService } from "@/services/offlineDataService";
import { offlineSyncService } from "@/services/offlineSyncService";

export const useWeeklyPlanning = (weekStart: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCached, setIsCached] = useState(false);

  const { data: planningSession, isLoading } = useQuery({
    queryKey: ['weekly-planning', user?.id, weekStart],
    queryFn: async () => {
      try {
        const data = await HabitsService.getWeeklyPlanningSession(weekStart);
        // Cache for offline use
        if (data) {
          offlineDataService.cacheWeeklyPlanning(data, weekStart);
        }
        offlineDataService.updateLastSync();
        setIsCached(false);
        return data;
      } catch (err) {
        // If offline, try to get cached data
        if (!navigator.onLine) {
          const cached = await offlineDataService.getCachedWeeklyPlanning(weekStart);
          if (cached) {
            setIsCached(true);
            return cached;
          }
        }
        throw err;
      }
    },
    enabled: !!user && !!weekStart,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: CreateWeeklyPlanningSession) => {
      // If offline, queue the mutation
      if (!navigator.onLine) {
        await offlineSyncService.queueMutation({
          type: 'create',
          table: 'weekly_planning_sessions',
          data: {
            ...data,
            user_id: user?.id,
            week_start: weekStart,
          },
        });
        // Optimistically cache the session
        const optimisticSession = {
          ...data,
          id: crypto.randomUUID(),
          user_id: user?.id,
          week_start: weekStart,
          is_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await offlineDataService.cacheWeeklyPlanning(optimisticSession, weekStart);
        return optimisticSession;
      }
      return HabitsService.createOrUpdatePlanningSession(data);
    },
    onSuccess: (data) => {
      // Cache the result
      if (data) {
        offlineDataService.cacheWeeklyPlanning(data, weekStart);
      }
      queryClient.invalidateQueries({ queryKey: ['weekly-planning'] });
    },
    onError: (error) => {
      console.error('Planning save error:', error);
      toast({
        title: "Error",
        description: "Failed to save planning session",
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!navigator.onLine) {
        // Queue the completion
        await offlineSyncService.queueMutation({
          type: 'update',
          table: 'weekly_planning_sessions',
          data: {
            id: planningSession?.id,
            updates: { is_completed: true, completed_at: new Date().toISOString() },
          },
        });
        // Optimistically update cache
        const updatedSession = {
          ...planningSession,
          is_completed: true,
          completed_at: new Date().toISOString(),
        };
        await offlineDataService.cacheWeeklyPlanning(updatedSession, weekStart);
        return updatedSession;
      }
      return HabitsService.completePlanningSession(weekStart);
    },
    onSuccess: (data) => {
      if (data) {
        offlineDataService.cacheWeeklyPlanning(data, weekStart);
      }
      queryClient.invalidateQueries({ queryKey: ['weekly-planning'] });
      toast({
        title: "Planning complete! 📅",
        description: navigator.onLine ? "You're ready to crush this week!" : "Saved offline - will sync when online.",
      });
    },
    onError: (error) => {
      console.error('Planning complete error:', error);
    },
  });

  return {
    planningSession,
    isLoading,
    isCached,
    hasCompletedPlanning: planningSession?.is_completed || false,
    savePlanningSession: saveMutation.mutateAsync,
    completePlanningSession: completeMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isCompleting: completeMutation.isPending,
  };
};

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
  const [lastSync, setLastSync] = useState<Date | null>(null);

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
        setLastSync(new Date());
        setIsCached(false);
        return data;
      } catch (err) {
        // If offline, try to get cached data
        if (!navigator.onLine) {
          const cached = await offlineDataService.getCachedWeeklyPlanning(weekStart);
          if (cached) {
            setIsCached(true);
            const syncTime = await offlineDataService.getLastSync();
            setLastSync(syncTime ? new Date(syncTime) : null);
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
      try {
        const result = await HabitsService.createOrUpdatePlanningSession(data);
        return { result, wasOffline: false };
      } catch (error) {
        const isNetworkError = !navigator.onLine || 
          (error instanceof Error && (
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('Failed to fetch') ||
            error.name === 'TypeError'
          ));
        
        if (isNetworkError) {
          console.log('Network error detected, queuing for offline sync');
          await offlineSyncService.queueMutation({
            type: 'create',
            table: 'weekly_planning_sessions',
            data: {
              ...data,
              user_id: user?.id,
              week_start: weekStart,
            },
          });
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
          return { result: optimisticSession, wasOffline: true };
        }
        throw error;
      }
    },
    onSuccess: ({ result, wasOffline }) => {
      if (result) {
        offlineDataService.cacheWeeklyPlanning(result, weekStart);
      }
      queryClient.invalidateQueries({ queryKey: ['weekly-planning'] });
      if (wasOffline) {
        toast({
          title: "Saved offline",
          description: "Will sync when you're back online.",
        });
      }
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
      try {
        const result = await HabitsService.completePlanningSession(weekStart);
        return { result, wasOffline: false };
      } catch (error) {
        const isNetworkError = !navigator.onLine || 
          (error instanceof Error && (
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('Failed to fetch') ||
            error.name === 'TypeError'
          ));
        
        if (isNetworkError) {
          console.log('Network error detected, queuing completion for offline sync');
          await offlineSyncService.queueMutation({
            type: 'update',
            table: 'weekly_planning_sessions',
            data: {
              id: planningSession?.id,
              updates: { is_completed: true, completed_at: new Date().toISOString() },
            },
          });
          const updatedSession = {
            ...planningSession,
            is_completed: true,
            completed_at: new Date().toISOString(),
          };
          await offlineDataService.cacheWeeklyPlanning(updatedSession, weekStart);
          return { result: updatedSession, wasOffline: true };
        }
        throw error;
      }
    },
    onSuccess: ({ result, wasOffline }) => {
      if (result) {
        offlineDataService.cacheWeeklyPlanning(result, weekStart);
      }
      queryClient.invalidateQueries({ queryKey: ['weekly-planning'] });
      toast({
        title: "Planning complete! 📅",
        description: wasOffline ? "Saved offline - will sync when online." : "You're ready to crush this week!",
      });
    },
    onError: (error) => {
      console.error('Planning complete error:', error);
      toast({
        title: "Error",
        description: "Failed to complete planning session",
        variant: "destructive",
      });
    },
  });

  return {
    planningSession,
    isLoading,
    isCached,
    lastSync,
    hasCompletedPlanning: planningSession?.is_completed || false,
    savePlanningSession: saveMutation.mutateAsync,
    completePlanningSession: completeMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isCompleting: completeMutation.isPending,
  };
};

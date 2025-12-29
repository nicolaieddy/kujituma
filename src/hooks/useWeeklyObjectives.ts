import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { HabitStreaksService } from "@/services/habitStreaksService";
import { CreateWeeklyObjectiveData, UpdateWeeklyObjectiveData } from "@/types/weeklyProgress";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { celebrateStreakMilestone, getStreakMilestoneMessage } from "@/utils/confetti";
import { offlineDataService } from "@/services/offlineDataService";
import { offlineSyncService } from "@/services/offlineSyncService";

export const useWeeklyObjectives = (currentWeekStart: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCached, setIsCached] = useState(false);

  const { data: objectives = [], isLoading: objectivesLoading, error: objectivesError } = useQuery({
    queryKey: ['weekly-objectives', user?.id, currentWeekStart],
    queryFn: async () => {
      try {
        const data = await WeeklyProgressService.getWeeklyObjectives(currentWeekStart);
        // Cache for offline use
        offlineDataService.cacheWeeklyObjectives(data, currentWeekStart);
        offlineDataService.updateLastSync();
        setIsCached(false);
        return data;
      } catch (err) {
        // If offline, try to get cached data
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
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: 1,
  });

  const createObjectiveMutation = useMutation({
    mutationFn: async (data: CreateWeeklyObjectiveData & { week_start: string }) => {
      try {
        const result = await WeeklyProgressService.createWeeklyObjective(data);
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
          console.log('Network error detected, queuing objective creation for offline sync');
          const optimisticObjective = {
            id: crypto.randomUUID(),
            user_id: user?.id,
            text: data.text,
            goal_id: data.goal_id || null,
            week_start: data.week_start,
            is_completed: false,
            order_index: 0,
            scheduled_day: data.scheduled_day || null,
            scheduled_time: data.scheduled_time || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          await offlineSyncService.queueMutation({
            type: 'create',
            table: 'weekly_objectives',
            data: optimisticObjective,
          });
          
          // Update cache optimistically
          const cached = await offlineDataService.getCachedWeeklyObjectives(currentWeekStart);
          const updated = [...(cached || []), optimisticObjective];
          offlineDataService.cacheWeeklyObjectives(updated, currentWeekStart);
          
          return { result: optimisticObjective, wasOffline: true };
        }
        throw error;
      }
    },
    onSuccess: ({ result, wasOffline }) => {
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
      toast({
        title: wasOffline ? "Saved offline" : "Success",
        description: wasOffline ? "Will sync when you're back online." : "Objective created successfully!",
      });
    },
    onError: (error) => {
      console.error('Error creating objective:', error);
      toast({
        title: "Error",
        description: "Failed to create objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateObjectiveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWeeklyObjectiveData }) => {
      try {
        const result = await WeeklyProgressService.updateWeeklyObjective(id, data);
        return { result, wasOffline: false, id, data };
      } catch (error) {
        const isNetworkError = !navigator.onLine || 
          (error instanceof Error && (
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('Failed to fetch') ||
            error.name === 'TypeError'
          ));
        
        if (isNetworkError) {
          console.log('Network error detected, queuing objective update for offline sync');
          await offlineSyncService.queueMutation({
            type: 'update',
            table: 'weekly_objectives',
            data: { id, updates: data },
          });
          
          // Update cache optimistically
          const cached = await offlineDataService.getCachedWeeklyObjectives(currentWeekStart);
          if (cached) {
            const updated = cached.map((obj: any) => obj.id === id ? { ...obj, ...data } : obj);
            offlineDataService.cacheWeeklyObjectives(updated, currentWeekStart);
          }
          
          return { result: { id, ...data }, wasOffline: true, id, data };
        }
        throw error;
      }
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
      const previousObjectives = queryClient.getQueryData(['weekly-objectives', user?.id, currentWeekStart]);
      queryClient.setQueryData(['weekly-objectives', user?.id, currentWeekStart], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map(obj => obj.id === id ? { ...obj, ...data } : obj);
      });
      return { previousObjectives };
    },
    onError: (error, variables, context) => {
      if (context?.previousObjectives) {
        queryClient.setQueryData(['weekly-objectives', user?.id, currentWeekStart], context.previousObjectives);
      }
      console.error('Error updating objective:', error);
      toast({
        title: "Error",
        description: "Failed to update objective. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: (result) => {
      if (!result?.wasOffline) {
        queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
      }
    },
  });

  const deleteObjectiveMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await WeeklyProgressService.deleteWeeklyObjective(id);
        return { wasOffline: false };
      } catch (error) {
        const isNetworkError = !navigator.onLine || 
          (error instanceof Error && (
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('Failed to fetch') ||
            error.name === 'TypeError'
          ));
        
        if (isNetworkError) {
          console.log('Network error detected, queuing objective deletion for offline sync');
          await offlineSyncService.queueMutation({
            type: 'delete',
            table: 'weekly_objectives',
            data: { id },
          });
          
          // Update cache optimistically
          const cached = await offlineDataService.getCachedWeeklyObjectives(currentWeekStart);
          if (cached) {
            const updated = cached.filter((obj: any) => obj.id !== id);
            offlineDataService.cacheWeeklyObjectives(updated, currentWeekStart);
          }
          
          return { wasOffline: true };
        }
        throw error;
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
      const previousObjectives = queryClient.getQueryData(['weekly-objectives', user?.id, currentWeekStart]);
      queryClient.setQueryData(['weekly-objectives', user?.id, currentWeekStart], (old: any[] | undefined) => {
        if (!old) return old;
        return old.filter(obj => obj.id !== id);
      });
      return { previousObjectives };
    },
    onSuccess: ({ wasOffline }) => {
      if (!wasOffline) {
        queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
      }
      toast({
        title: wasOffline ? "Saved offline" : "Success",
        description: wasOffline ? "Will sync when you're back online." : "Objective deleted successfully!",
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousObjectives) {
        queryClient.setQueryData(['weekly-objectives', user?.id, currentWeekStart], context.previousObjectives);
      }
      console.error('Error deleting objective:', error);
      toast({
        title: "Error",
        description: "Failed to delete objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAllObjectivesMutation = useMutation({
    mutationFn: async (weekStart: string) => {
      try {
        const result = await WeeklyProgressService.deleteAllWeeklyObjectives(weekStart);
        return { deletedCount: result, wasOffline: false };
      } catch (error) {
        const isNetworkError = !navigator.onLine || 
          (error instanceof Error && (
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('Failed to fetch') ||
            error.name === 'TypeError'
          ));
        
        if (isNetworkError) {
          console.log('Network error detected, queuing delete all for offline sync');
          const cached = await offlineDataService.getCachedWeeklyObjectives(weekStart);
          const count = cached?.length || 0;
          
          // Queue individual deletes for each objective
          if (cached) {
            for (const obj of cached) {
              await offlineSyncService.queueMutation({
                type: 'delete',
                table: 'weekly_objectives',
                data: { id: obj.id },
              });
            }
          }
          
          // Clear cache
          offlineDataService.cacheWeeklyObjectives([], weekStart);
          
          return { deletedCount: count, wasOffline: true };
        }
        throw error;
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
      const previousObjectives = queryClient.getQueryData(['weekly-objectives', user?.id, currentWeekStart]);
      queryClient.setQueryData(['weekly-objectives', user?.id, currentWeekStart], []);
      return { previousObjectives };
    },
    onSuccess: ({ deletedCount, wasOffline }) => {
      if (!wasOffline) {
        queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
      }
      toast({
        title: wasOffline ? "Saved offline" : "Success",
        description: wasOffline 
          ? `${deletedCount} objective${deletedCount !== 1 ? 's' : ''} will be deleted when online.`
          : `${deletedCount} objective${deletedCount !== 1 ? 's' : ''} cleared successfully!`,
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousObjectives) {
        queryClient.setQueryData(['weekly-objectives', user?.id, currentWeekStart], context.previousObjectives);
      }
      console.error('Error deleting all objectives:', error);
      toast({
        title: "Error",
        description: "Failed to clear objectives. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createObjective = (data: CreateWeeklyObjectiveData) => {
    createObjectiveMutation.mutate({ ...data, week_start: currentWeekStart });
  };

  const updateObjective = async (id: string, data: UpdateWeeklyObjectiveData) => {
    // Check for streak milestone before completing
    if (data.is_completed === true) {
      try {
        const milestoneCheck = await HabitStreaksService.checkStreakMilestone(id);
        if (milestoneCheck?.isMilestone) {
          // Delay celebration slightly to let the UI update first
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
      } catch (error) {
        console.error('Error checking streak milestone:', error);
      }
    }
    updateObjectiveMutation.mutate({ id, data });
  };

  const deleteObjective = (id: string) => {
    deleteObjectiveMutation.mutate(id);
  };

  const deleteAllObjectives = () => {
    deleteAllObjectivesMutation.mutate(currentWeekStart);
  };

  return {
    objectives,
    isLoading: objectivesLoading,
    error: objectivesError,
    isCached,
    createObjective,
    updateObjective,
    deleteObjective,
    deleteAllObjectives,
    isCreating: createObjectiveMutation.isPending,
    isUpdating: updateObjectiveMutation.isPending,
    isDeleting: deleteObjectiveMutation.isPending,
    isDeletingAll: deleteAllObjectivesMutation.isPending,
  };
};
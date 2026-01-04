import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { CreateWeeklyObjectiveData, UpdateWeeklyObjectiveData } from "@/types/weeklyProgress";
import { toast } from "@/hooks/use-toast";
import { offlineDataService } from "@/services/offlineDataService";
import { isNetworkError, queueOfflineMutation } from "@/utils/offlineUtils";

interface UseObjectiveMutationsProps {
  userId: string | undefined;
  currentWeekStart: string;
}

export const useObjectiveMutations = ({ userId, currentWeekStart }: UseObjectiveMutationsProps) => {
  const queryClient = useQueryClient();
  const queryKey = ['weekly-objectives', userId, currentWeekStart];

  const createMutation = useMutation({
    mutationFn: async (data: CreateWeeklyObjectiveData & { week_start: string }) => {
      try {
        const result = await WeeklyProgressService.createWeeklyObjective(data);
        return { result, wasOffline: false };
      } catch (error) {
        if (isNetworkError(error)) {
          console.log('Network error, queuing objective creation for offline sync');
          const optimisticObjective = {
            id: crypto.randomUUID(),
            user_id: userId,
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
          
          await queueOfflineMutation('create', 'weekly_objectives', optimisticObjective);
          
          const cached = await offlineDataService.getCachedWeeklyObjectives(currentWeekStart);
          const updated = [...(cached || []), optimisticObjective];
          offlineDataService.cacheWeeklyObjectives(updated, currentWeekStart);
          
          return { result: optimisticObjective, wasOffline: true };
        }
        throw error;
      }
    },
    onSuccess: ({ wasOffline }) => {
      queryClient.invalidateQueries({ queryKey });
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWeeklyObjectiveData }) => {
      try {
        const result = await WeeklyProgressService.updateWeeklyObjective(id, data);
        return { result, wasOffline: false, id, data };
      } catch (error) {
        if (isNetworkError(error)) {
          console.log('Network error, queuing objective update for offline sync');
          await queueOfflineMutation('update', 'weekly_objectives', { id, updates: data });
          
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
      await queryClient.cancelQueries({ queryKey });
      const previousObjectives = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
        if (!old) return old;
        return old.map(obj => obj.id === id ? { ...obj, ...data } : obj);
      });
      return { previousObjectives };
    },
    onError: (error, variables, context) => {
      if (context?.previousObjectives) {
        queryClient.setQueryData(queryKey, context.previousObjectives);
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
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await WeeklyProgressService.deleteWeeklyObjective(id);
        return { wasOffline: false };
      } catch (error) {
        if (isNetworkError(error)) {
          console.log('Network error, queuing objective deletion for offline sync');
          await queueOfflineMutation('delete', 'weekly_objectives', { id });
          
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
      await queryClient.cancelQueries({ queryKey });
      const previousObjectives = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
        if (!old) return old;
        return old.filter(obj => obj.id !== id);
      });
      return { previousObjectives };
    },
    onSuccess: ({ wasOffline }) => {
      if (!wasOffline) {
        queryClient.invalidateQueries({ queryKey });
      }
      toast({
        title: wasOffline ? "Saved offline" : "Success",
        description: wasOffline ? "Will sync when you're back online." : "Objective deleted successfully!",
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousObjectives) {
        queryClient.setQueryData(queryKey, context.previousObjectives);
      }
      console.error('Error deleting objective:', error);
      toast({
        title: "Error",
        description: "Failed to delete objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async (weekStart: string) => {
      try {
        const result = await WeeklyProgressService.deleteAllWeeklyObjectives(weekStart);
        return { deletedCount: result, wasOffline: false };
      } catch (error) {
        if (isNetworkError(error)) {
          console.log('Network error, queuing delete all for offline sync');
          const cached = await offlineDataService.getCachedWeeklyObjectives(weekStart);
          const count = cached?.length || 0;
          
          if (cached) {
            for (const obj of cached) {
              await queueOfflineMutation('delete', 'weekly_objectives', { id: obj.id });
            }
          }
          
          offlineDataService.cacheWeeklyObjectives([], weekStart);
          return { deletedCount: count, wasOffline: true };
        }
        throw error;
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previousObjectives = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, []);
      return { previousObjectives };
    },
    onSuccess: ({ deletedCount, wasOffline }) => {
      if (!wasOffline) {
        queryClient.invalidateQueries({ queryKey });
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
        queryClient.setQueryData(queryKey, context.previousObjectives);
      }
      console.error('Error deleting all objectives:', error);
      toast({
        title: "Error",
        description: "Failed to clear objectives. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    deleteAllMutation,
  };
};

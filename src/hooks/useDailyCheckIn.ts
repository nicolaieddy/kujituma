import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HabitsService } from "@/services/habitsService";
import { useAuth } from "@/contexts/AuthContext";
import { CreateDailyCheckIn } from "@/types/habits";
import { toast } from "@/hooks/use-toast";
import { offlineDataService } from "@/services/offlineDataService";
import { isNetworkError, queueOfflineMutation } from "@/utils/offlineUtils";

export const useDailyCheckIn = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCached, setIsCached] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Get today's date for caching
  const today = new Date().toISOString().split('T')[0];

  const { data: todayCheckIn, isLoading } = useQuery({
    queryKey: ['daily-check-in', user?.id],
    queryFn: async () => {
      try {
        const data = await HabitsService.getTodayCheckIn();
        // Cache for offline use
        if (data) {
          offlineDataService.cacheDailyCheckIn(data, today);
        }
        offlineDataService.updateLastSync();
        setLastSync(new Date());
        setIsCached(false);
        return data;
      } catch (err) {
        // If offline, try to get cached data
        if (!navigator.onLine) {
          const cached = await offlineDataService.getCachedDailyCheckIn(today);
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
    enabled: !!user,
  });

  const { data: recentCheckIns } = useQuery({
    queryKey: ['recent-check-ins', user?.id],
    queryFn: async () => {
      try {
        const data = await HabitsService.getRecentCheckIns(7);
        // Cache recent check-ins
        if (data && data.length > 0) {
          for (const checkIn of data) {
            offlineDataService.cacheDailyCheckIn(checkIn, checkIn.check_in_date);
          }
        }
        return data;
      } catch (err) {
        if (!navigator.onLine) {
          // Return empty array when offline - we have today's cached at least
          return [];
        }
        throw err;
      }
    },
    enabled: !!user,
  });

  const checkInMutation = useMutation({
    mutationFn: async (data: CreateDailyCheckIn) => {
      // Try online first, fall back to offline queue on network errors
      try {
        const result = await HabitsService.createOrUpdateCheckIn(data);
        return { result, wasOffline: false };
      } catch (error) {
        if (isNetworkError(error)) {
          console.log('Network error detected, queuing for offline sync');
          await queueOfflineMutation('create', 'daily_check_ins', {
            ...data,
            user_id: user?.id,
            check_in_date: today,
          });
          
          // Optimistically cache the check-in
          const optimisticCheckIn = {
            ...data,
            id: crypto.randomUUID(),
            user_id: user?.id,
            check_in_date: today,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          await offlineDataService.cacheDailyCheckIn(optimisticCheckIn, today);
          return { result: optimisticCheckIn, wasOffline: true };
        }
        
        // Re-throw non-network errors
        throw error;
      }
    },
    onSuccess: ({ result, wasOffline }) => {
      // Cache the result
      if (result) {
        offlineDataService.cacheDailyCheckIn(result, today);
      }
      queryClient.invalidateQueries({ queryKey: ['daily-check-in'] });
      queryClient.invalidateQueries({ queryKey: ['recent-check-ins'] });
      queryClient.invalidateQueries({ queryKey: ['user-streaks'] });
      toast({
        title: "Check-in complete! 🎯",
        description: wasOffline ? "Saved offline - will sync when online." : "Great job showing up today!",
      });
    },
    onError: (error) => {
      console.error('Check-in error:', error);
      toast({
        title: "Error",
        description: "Failed to save check-in",
        variant: "destructive",
      });
    },
  });

  return {
    todayCheckIn,
    recentCheckIns,
    isLoading,
    isCached,
    lastSync,
    hasCheckedInToday: !!todayCheckIn,
    submitCheckIn: checkInMutation.mutateAsync,
    isSubmitting: checkInMutation.isPending,
  };
};

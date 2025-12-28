import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HabitsService } from "@/services/habitsService";
import { useAuth } from "@/contexts/AuthContext";
import { CreateDailyCheckIn } from "@/types/habits";
import { toast } from "@/hooks/use-toast";
import { offlineDataService } from "@/services/offlineDataService";
import { offlineSyncService } from "@/services/offlineSyncService";

export const useDailyCheckIn = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCached, setIsCached] = useState(false);

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
        setIsCached(false);
        return data;
      } catch (err) {
        // If offline, try to get cached data
        if (!navigator.onLine) {
          const cached = await offlineDataService.getCachedDailyCheckIn(today);
          if (cached) {
            setIsCached(true);
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
      // If offline, queue the mutation
      if (!navigator.onLine) {
        await offlineSyncService.queueMutation({
          type: 'create',
          table: 'daily_check_ins',
          data: {
            ...data,
            user_id: user?.id,
            check_in_date: today,
          },
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
        return optimisticCheckIn;
      }
      return HabitsService.createOrUpdateCheckIn(data);
    },
    onSuccess: (data) => {
      // Cache the result
      if (data) {
        offlineDataService.cacheDailyCheckIn(data, today);
      }
      queryClient.invalidateQueries({ queryKey: ['daily-check-in'] });
      queryClient.invalidateQueries({ queryKey: ['recent-check-ins'] });
      queryClient.invalidateQueries({ queryKey: ['user-streaks'] });
      toast({
        title: "Check-in complete! 🎯",
        description: navigator.onLine ? "Great job showing up today!" : "Saved offline - will sync when online.",
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
    hasCheckedInToday: !!todayCheckIn,
    submitCheckIn: checkInMutation.mutateAsync,
    isSubmitting: checkInMutation.isPending,
  };
};

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format } from "date-fns";

interface SyncedActivity {
  id: string;
  strava_activity_id: number;
  activity_type: string;
  activity_name: string;
  start_date: string;
  duration_seconds: number;
  distance_meters: number;
  matched_habit_item_id: string | null;
  matched_goal_id: string | null;
  habit_completion_created: boolean;
}

export function useSyncedActivities(weekStart?: Date) {
  const { user } = useAuth();
  const currentWeekStart = weekStart || startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  
  const weekKey = format(currentWeekStart, "yyyy-MM-dd");

  const { data: syncedActivities = [], isLoading } = useQuery({
    queryKey: ["synced-activities", user?.id, weekKey],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("synced_activities")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_date", currentWeekStart.toISOString())
        .lte("start_date", currentWeekEnd.toISOString())
        .eq("habit_completion_created", true);

      if (error) {
        console.error("Failed to fetch synced activities:", error);
        return [];
      }

      return (data || []) as SyncedActivity[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Check if a habit item was completed via Strava on a specific date
  const isStravaCompletion = (habitItemId: string, date: Date): SyncedActivity | null => {
    const dateStr = format(date, "yyyy-MM-dd");
    
    return syncedActivities.find(activity => 
      activity.matched_habit_item_id === habitItemId &&
      activity.start_date?.startsWith(dateStr)
    ) || null;
  };

  // Get all Strava completions for a habit item this week
  const getStravaCompletionsForHabit = (habitItemId: string): SyncedActivity[] => {
    return syncedActivities.filter(activity => 
      activity.matched_habit_item_id === habitItemId
    );
  };

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${Math.round(meters)}m`;
  };

  return {
    syncedActivities,
    isLoading,
    isStravaCompletion,
    getStravaCompletionsForHabit,
    formatDuration,
    formatDistance,
  };
}
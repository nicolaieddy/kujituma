import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const SUPABASE_URL = "https://yyidkpmrqvgvzbjvtnjy.supabase.co";

// Common Strava activity types
export const STRAVA_ACTIVITY_TYPES = [
  { value: "Run", label: "Run" },
  { value: "TrailRun", label: "Trail Run" },
  { value: "VirtualRun", label: "Virtual Run" },
  { value: "Ride", label: "Ride" },
  { value: "MountainBikeRide", label: "Mountain Bike" },
  { value: "GravelRide", label: "Gravel Ride" },
  { value: "VirtualRide", label: "Virtual Ride" },
  { value: "Swim", label: "Swim" },
  { value: "Walk", label: "Walk" },
  { value: "Hike", label: "Hike" },
  { value: "WeightTraining", label: "Weight Training" },
  { value: "Workout", label: "Workout" },
  { value: "Yoga", label: "Yoga" },
  { value: "CrossFit", label: "CrossFit" },
  { value: "Rowing", label: "Rowing" },
  { value: "Elliptical", label: "Elliptical" },
  { value: "StairStepper", label: "Stair Stepper" },
  { value: "Pilates", label: "Pilates" },
  { value: "Golf", label: "Golf" },
  { value: "Tennis", label: "Tennis" },
  { value: "Pickleball", label: "Pickleball" },
  { value: "Soccer", label: "Soccer" },
  { value: "Basketball", label: "Basketball" },
] as const;

// Duolingo activity types
export const DUOLINGO_ACTIVITY_TYPES = [
  { value: "daily_goal", label: "Daily Goal" },
  { value: "lesson", label: "Lesson Completed" },
  { value: "streak", label: "Streak Maintained" },
  { value: "practice", label: "Practice Session" },
] as const;

export type IntegrationType = 'strava' | 'duolingo';

export interface ActivityMapping {
  id: string;
  user_id: string;
  strava_activity_type: string;
  goal_id: string;
  habit_item_id: string;
  min_duration_minutes: number;
  integration_type: IntegrationType;
  duolingo_activity_type?: string;
  created_at: string;
}

export function useActivityMappings() {
  const { user, session } = useAuth();
  const [mappings, setMappings] = useState<ActivityMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const fetchMappings = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("activity_mappings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMappings((data as ActivityMapping[]) || []);
    } catch (error) {
      console.error("Failed to fetch activity mappings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  // Trigger Strava sync after mapping changes
  const triggerSync = useCallback(async () => {
    if (!session) return;
    
    setIsSyncing(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/strava-sync`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (response.ok && result.matched > 0) {
        toast.success(`Synced ${result.matched} activity${result.matched > 1 ? 'ies' : 'y'} from Strava!`);
        // Invalidate habit completions and synced activities
        queryClient.invalidateQueries({ queryKey: ["habit-completions"] });
        queryClient.invalidateQueries({ queryKey: ["synced-activities"] });
      }
    } catch (error) {
      console.error("Failed to trigger Strava sync:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [session, queryClient]);

  const createMapping = useCallback(async (
    activityType: string,
    goalId: string,
    habitItemId: string,
    minDurationMinutes: number = 0,
    integrationType: IntegrationType = 'strava'
  ) => {
    if (!user) {
      toast.error("Please log in first");
      return null;
    }

    try {
      // Determine the strava_activity_type field (used as unique constraint key)
      const stravaActivityType = integrationType === 'duolingo' 
        ? `duolingo_${activityType}` 
        : activityType;

      const { data, error } = await supabase
        .from("activity_mappings")
        .upsert({
          user_id: user.id,
          goal_id: goalId,
          habit_item_id: habitItemId,
          min_duration_minutes: minDurationMinutes,
          integration_type: integrationType,
          strava_activity_type: stravaActivityType,
        }, {
          onConflict: "user_id,strava_activity_type",
        })
        .select()
        .single();

      if (error) throw error;

      const integrationName = integrationType === 'strava' ? 'Strava' : 'Duolingo';
      toast.success(`Linked habit to ${integrationName}`);
      await fetchMappings();
      
      // Auto-trigger sync after creating mapping (only for Strava)
      if (integrationType === 'strava') {
        triggerSync();
      }
      
      return data as ActivityMapping;
    } catch (error) {
      console.error("Failed to create mapping:", error);
      toast.error("Failed to save mapping");
      return null;
    }
  }, [user, fetchMappings, triggerSync]);

  const deleteMapping = useCallback(async (mappingId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("activity_mappings")
        .delete()
        .eq("id", mappingId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Mapping removed");
      await fetchMappings();
    } catch (error) {
      console.error("Failed to delete mapping:", error);
      toast.error("Failed to remove mapping");
    }
  }, [user, fetchMappings]);

  const getMappingForActivityType = useCallback((activityType: string, integrationType?: IntegrationType) => {
    return mappings.find(m => {
      if (integrationType && m.integration_type !== integrationType) return false;
      return m.strava_activity_type === activityType || m.duolingo_activity_type === activityType;
    });
  }, [mappings]);

  const getMappingForHabitItem = useCallback((habitItemId: string) => {
    return mappings.find(m => m.habit_item_id === habitItemId);
  }, [mappings]);

  const getMappingsForIntegration = useCallback((integrationType: IntegrationType) => {
    return mappings.filter(m => m.integration_type === integrationType);
  }, [mappings]);

  return {
    mappings,
    isLoading,
    isSyncing,
    createMapping,
    deleteMapping,
    getMappingForActivityType,
    getMappingForHabitItem,
    getMappingsForIntegration,
    refreshMappings: fetchMappings,
    triggerSync,
  };
}
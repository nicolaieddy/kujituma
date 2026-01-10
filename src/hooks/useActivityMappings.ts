import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export interface ActivityMapping {
  id: string;
  user_id: string;
  strava_activity_type: string;
  goal_id: string;
  habit_item_id: string;
  min_duration_minutes: number;
  created_at: string;
}

export function useActivityMappings() {
  const { user } = useAuth();
  const [mappings, setMappings] = useState<ActivityMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const createMapping = useCallback(async (
    stravaActivityType: string,
    goalId: string,
    habitItemId: string,
    minDurationMinutes: number = 0
  ) => {
    if (!user) {
      toast.error("Please log in first");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("activity_mappings")
        .upsert({
          user_id: user.id,
          strava_activity_type: stravaActivityType,
          goal_id: goalId,
          habit_item_id: habitItemId,
          min_duration_minutes: minDurationMinutes,
        }, {
          onConflict: "user_id,strava_activity_type",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Mapped ${stravaActivityType} to your habit`);
      await fetchMappings();
      return data as ActivityMapping;
    } catch (error) {
      console.error("Failed to create mapping:", error);
      toast.error("Failed to save mapping");
      return null;
    }
  }, [user, fetchMappings]);

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

  const getMappingForActivityType = useCallback((activityType: string) => {
    return mappings.find(m => m.strava_activity_type === activityType);
  }, [mappings]);

  return {
    mappings,
    isLoading,
    createMapping,
    deleteMapping,
    getMappingForActivityType,
    refreshMappings: fetchMappings,
  };
}
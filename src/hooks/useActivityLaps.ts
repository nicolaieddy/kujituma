import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityLap {
  id: string;
  lap_index: number;
  start_time: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  avg_speed: number | null;
  max_speed: number | null;
  avg_cadence: number | null;
  avg_power: number | null;
  total_elevation_gain: number | null;
  calories: number | null;
}

export function useActivityLaps(activityId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["activity-laps", activityId],
    queryFn: async () => {
      if (!user || !activityId) return [];
      const { data, error } = await supabase
        .from("activity_laps")
        .select("*")
        .eq("activity_id", activityId)
        .eq("user_id", user.id)
        .order("lap_index");

      if (error) {
        console.error("Failed to fetch laps:", error);
        return [];
      }
      return data as ActivityLap[];
    },
    enabled: !!user && !!activityId,
    staleTime: 1000 * 60 * 10,
  });
}

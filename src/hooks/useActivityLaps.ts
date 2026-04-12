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
  max_power: number | null;
  total_elevation_gain: number | null;
  total_ascent: number | null;
  total_descent: number | null;
  calories: number | null;
  avg_ground_contact_time: number | null;
  avg_stride_length: number | null;
  avg_vertical_oscillation: number | null;
  avg_vertical_ratio: number | null;
  avg_temperature: number | null;
  total_strides: number | null;
  normalized_power: number | null;
  moving_time_seconds: number | null;
  min_altitude: number | null;
  max_altitude: number | null;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
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

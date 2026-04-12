import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface WorkoutPrefs {
  id?: string;
  distance_unit: "km" | "mi";
  elevation_unit: "m" | "ft";
  pace_format: "min_per_km" | "min_per_mi";
  temperature_unit: "celsius" | "fahrenheit";
  weight_unit: "kg" | "lb";
  power_display: "watts" | "watts_per_kg";
}

const DEFAULTS: WorkoutPrefs = {
  distance_unit: "km",
  elevation_unit: "m",
  pace_format: "min_per_km",
  temperature_unit: "celsius",
  weight_unit: "kg",
  power_display: "watts",
};

export function useWorkoutPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["workout-preferences", user?.id],
    queryFn: async (): Promise<WorkoutPrefs> => {
      if (!user) return DEFAULTS;
      const { data, error } = await supabase
        .from("workout_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch workout prefs:", error);
        return DEFAULTS;
      }
      return data ? {
        id: data.id,
        distance_unit: data.distance_unit as WorkoutPrefs["distance_unit"],
        elevation_unit: data.elevation_unit as WorkoutPrefs["elevation_unit"],
        pace_format: data.pace_format as WorkoutPrefs["pace_format"],
        temperature_unit: data.temperature_unit as WorkoutPrefs["temperature_unit"],
        weight_unit: data.weight_unit as WorkoutPrefs["weight_unit"],
        power_display: data.power_display as WorkoutPrefs["power_display"],
      } : DEFAULTS;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<WorkoutPrefs>) => {
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("workout_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("workout_preferences")
          .update(updates)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workout_preferences")
          .insert({ user_id: user.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-preferences"] });
    },
  });

  return {
    prefs: prefs || DEFAULTS,
    isLoading,
    updatePrefs: updateMutation.mutateAsync,
    isSaving: updateMutation.isPending,
  };
}

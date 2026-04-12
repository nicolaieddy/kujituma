import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface TrainingPlanWorkout {
  id: string;
  user_id: string;
  week_start: string;
  goal_id: string | null;
  day_of_week: number;
  workout_type: string;
  title: string;
  description: string;
  target_distance_meters: number | null;
  target_duration_seconds: number | null;
  target_pace_per_km: number | null;
  notes: string;
  order_index: number;
  matched_strava_activity_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTrainingWorkoutData {
  week_start: string;
  goal_id?: string | null;
  day_of_week: number;
  workout_type: string;
  title: string;
  description?: string;
  target_distance_meters?: number | null;
  target_duration_seconds?: number | null;
  target_pace_per_km?: number | null;
  notes?: string;
  order_index?: number;
}

export function useTrainingPlan(weekStart: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["training-plan", user?.id, weekStart],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("training_plan_workouts")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .order("day_of_week", { ascending: true })
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []) as TrainingPlanWorkout[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Get matched strava activities for the workouts
  const matchedActivityIds = workouts
    .filter(w => w.matched_strava_activity_id)
    .map(w => w.matched_strava_activity_id!);

  const { data: matchedActivities = [] } = useQuery({
    queryKey: ["training-matched-activities", matchedActivityIds],
    queryFn: async () => {
      if (matchedActivityIds.length === 0) return [];
      const { data, error } = await supabase
        .from("synced_activities")
        .select("*")
        .in("strava_activity_id", matchedActivityIds);
      if (error) throw error;
      return data || [];
    },
    enabled: matchedActivityIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["training-plan", user?.id, weekStart] });
  };

  const createWorkout = useMutation({
    mutationFn: async (data: CreateTrainingWorkoutData) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("training_plan_workouts")
        .insert({ ...data, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Workout added to training plan" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add workout", description: error.message, variant: "destructive" });
    },
  });

  const updateWorkout = useMutation({
    mutationFn: async ({ id, ...data }: Partial<TrainingPlanWorkout> & { id: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("training_plan_workouts")
        .update(data)
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteWorkout = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("training_plan_workouts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Workout removed" });
    },
  });

  const copyFromPreviousWeek = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      // Calculate previous week
      const [y, m, d] = weekStart.split('-').map(Number);
      const prevMonday = new Date(y, m - 1, d - 7);
      const prevWeekStart = prevMonday.toISOString().split("T")[0];

      const { data: prevWorkouts, error: fetchError } = await supabase
        .from("training_plan_workouts")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start", prevWeekStart)
        .order("day_of_week")
        .order("order_index");

      if (fetchError) throw fetchError;
      if (!prevWorkouts || prevWorkouts.length === 0) {
        throw new Error("No workouts found in the previous week");
      }

      const newWorkouts = prevWorkouts.map(w => ({
        user_id: user.id,
        week_start: weekStart,
        goal_id: w.goal_id,
        day_of_week: w.day_of_week,
        workout_type: w.workout_type,
        title: w.title,
        description: w.description,
        target_distance_meters: w.target_distance_meters,
        target_duration_seconds: w.target_duration_seconds,
        target_pace_per_km: w.target_pace_per_km,
        notes: w.notes,
        order_index: w.order_index,
      }));

      const { error: insertError } = await supabase
        .from("training_plan_workouts")
        .insert(newWorkouts);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Copied training plan from previous week" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to copy", description: error.message, variant: "destructive" });
    },
  });

  const getMatchedActivity = (stravaActivityId: number | null) => {
    if (!stravaActivityId) return null;
    return matchedActivities.find((a: any) => a.strava_activity_id === stravaActivityId) || null;
  };

  return {
    workouts,
    isLoading,
    matchedActivities,
    getMatchedActivity,
    createWorkout: createWorkout.mutateAsync,
    updateWorkout: updateWorkout.mutateAsync,
    deleteWorkout: deleteWorkout.mutateAsync,
    copyFromPreviousWeek: copyFromPreviousWeek.mutateAsync,
    isSaving: createWorkout.isPending || updateWorkout.isPending,
    isCreating: createWorkout.isPending,
    isCopying: copyFromPreviousWeek.isPending,
  };
}

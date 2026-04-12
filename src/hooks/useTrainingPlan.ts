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
  // Joined goal IDs from junction table
  goal_ids?: string[];
}

export interface CreateTrainingWorkoutData {
  week_start: string;
  goal_id?: string | null;
  goal_ids?: string[];
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

  // Fetch workouts
  const { data: rawWorkouts = [], isLoading } = useQuery({
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

  // Fetch goal links from junction table
  const workoutIds = rawWorkouts.map(w => w.id);
  const { data: goalLinks = [] } = useQuery({
    queryKey: ["training-workout-goals", workoutIds],
    queryFn: async () => {
      if (workoutIds.length === 0) return [];
      const { data, error } = await supabase
        .from("training_workout_goals")
        .select("workout_id, goal_id")
        .in("workout_id", workoutIds);
      if (error) throw error;
      return data || [];
    },
    enabled: workoutIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // Merge goal_ids into workouts
  const workouts: TrainingPlanWorkout[] = rawWorkouts.map(w => ({
    ...w,
    goal_ids: goalLinks.filter(l => l.workout_id === w.id).map(l => l.goal_id),
  }));

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
    queryClient.invalidateQueries({ queryKey: ["training-workout-goals"] });
    queryClient.invalidateQueries({ queryKey: ["training-workouts-for-goal"] });
  };

  const createWorkout = useMutation({
    mutationFn: async (data: CreateTrainingWorkoutData) => {
      if (!user) throw new Error("Not authenticated");
      const { goal_ids, ...rest } = data;
      const { data: inserted, error } = await supabase
        .from("training_plan_workouts")
        .insert({ ...rest, user_id: user.id })
        .select("id")
        .single();
      if (error) throw error;

      // Insert goal links
      const allGoalIds = goal_ids?.length ? goal_ids : rest.goal_id ? [rest.goal_id] : [];
      if (allGoalIds.length > 0 && inserted) {
        const { error: linkError } = await supabase
          .from("training_workout_goals")
          .insert(allGoalIds.map(gid => ({ workout_id: inserted.id, goal_id: gid })));
        if (linkError) throw linkError;
      }
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
    mutationFn: async ({ id, goal_ids, ...data }: Partial<TrainingPlanWorkout> & { id: string; goal_ids?: string[] }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("training_plan_workouts")
        .update(data)
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;

      // If goal_ids provided, sync junction table
      if (goal_ids !== undefined) {
        // Delete existing links
        await supabase.from("training_workout_goals").delete().eq("workout_id", id);
        // Insert new links
        if (goal_ids.length > 0) {
          const { error: linkError } = await supabase
            .from("training_workout_goals")
            .insert(goal_ids.map(gid => ({ workout_id: id, goal_id: gid })));
          if (linkError) throw linkError;
        }
      }
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

      // Insert workouts and collect IDs for goal link copying
      for (const w of prevWorkouts) {
        const { data: inserted, error: insertError } = await supabase
          .from("training_plan_workouts")
          .insert({
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
          })
          .select("id")
          .single();
        if (insertError) throw insertError;

        // Copy goal links
        const { data: links } = await supabase
          .from("training_workout_goals")
          .select("goal_id")
          .eq("workout_id", w.id);
        if (links && links.length > 0 && inserted) {
          await supabase
            .from("training_workout_goals")
            .insert(links.map(l => ({ workout_id: inserted.id, goal_id: l.goal_id })));
        }
      }
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

/** Hook to get workouts linked to a specific goal across all weeks */
export function useTrainingWorkoutsForGoal(goalId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["training-workouts-for-goal", goalId],
    queryFn: async () => {
      if (!user || !goalId) return [];
      // Get workout IDs linked to this goal
      const { data: links, error: linkErr } = await supabase
        .from("training_workout_goals")
        .select("workout_id")
        .eq("goal_id", goalId);
      if (linkErr) throw linkErr;
      if (!links || links.length === 0) return [];

      const workoutIds = links.map(l => l.workout_id);
      const { data, error } = await supabase
        .from("training_plan_workouts")
        .select("*")
        .in("id", workoutIds)
        .eq("user_id", user.id)
        .order("week_start", { ascending: false })
        .order("day_of_week", { ascending: true });
      if (error) throw error;
      return (data || []) as TrainingPlanWorkout[];
    },
    enabled: !!user && !!goalId,
    staleTime: 1000 * 60 * 5,
  });
}

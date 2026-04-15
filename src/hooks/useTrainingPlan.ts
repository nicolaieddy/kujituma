import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getLocalDateString, parseLocalDate } from "@/utils/dateUtils";

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
  matched_activity_id?: string | null;
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

  // Fetch activity links from junction table
  const { data: activityLinks = [] } = useQuery({
    queryKey: ["training-workout-activities", workoutIds],
    queryFn: async () => {
      if (workoutIds.length === 0) return [];
      const { data, error } = await supabase
        .from("training_workout_activities")
        .select("workout_id, activity_id, session_order")
        .in("workout_id", workoutIds)
        .order("session_order", { ascending: true });
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

  // Collect all activity IDs we need to fetch (from junction table + legacy columns)
  const junctionActivityIds = activityLinks.map(l => l.activity_id);
  const stravaActivityIds = workouts
    .filter(w => w.matched_strava_activity_id)
    .map(w => w.matched_strava_activity_id!);
  const directActivityIds = workouts
    .filter(w => (w as any).matched_activity_id)
    .map(w => (w as any).matched_activity_id as string);
  const allActivityIdsToFetch = Array.from(new Set([...junctionActivityIds, ...directActivityIds]));

  const { data: matchedActivities = [] } = useQuery({
    queryKey: ["training-matched-activities", allActivityIdsToFetch, stravaActivityIds, workouts.map(w => `${w.id}:${w.week_start}:${w.day_of_week}:${w.workout_type}`).join("|")],
    queryFn: async () => {
      const results: any[] = [];

      // Fetch by direct UUIDs (junction + legacy matched_activity_id)
      if (allActivityIdsToFetch.length > 0) {
        const { data, error } = await supabase
          .from("synced_activities")
          .select("*")
          .in("id", allActivityIdsToFetch);
        if (!error && data) results.push(...data);
      }

      // Fetch by Strava IDs
      if (stravaActivityIds.length > 0) {
        const { data, error } = await supabase
          .from("synced_activities")
          .select("*")
          .in("strava_activity_id", stravaActivityIds);
        if (!error && data) results.push(...data);
      }

      // Fallback matching for unresolved workouts (no junction link, no direct/strava match)
      const resolvedWorkoutIds = new Set(activityLinks.map(l => l.workout_id));
      const unresolvedWorkouts = workouts.filter(
        (w) => !resolvedWorkoutIds.has(w.id) && !w.matched_activity_id && !w.matched_strava_activity_id
      );

      if (unresolvedWorkouts.length > 0) {
        const weekStarts = Array.from(new Set(unresolvedWorkouts.map(w => w.week_start)));
        const earliestWeek = weekStarts.slice().sort()[0];
        const latestWeek = weekStarts.slice().sort().at(-1);

        if (earliestWeek && latestWeek) {
          const rangeStart = `${earliestWeek}T00:00:00Z`;
          const latestWeekDate = parseLocalDate(latestWeek);
          latestWeekDate.setDate(latestWeekDate.getDate() + 6);
          const rangeEnd = `${getLocalDateString(latestWeekDate)}T23:59:59Z`;

          const { data, error } = await supabase
            .from("synced_activities")
            .select("*")
            .eq("user_id", user!.id)
            .gte("start_date", rangeStart)
            .lte("start_date", rangeEnd)
            .order("start_date", { ascending: false });

          if (!error && data) {
            for (const workout of unresolvedWorkouts) {
              const workoutDate = parseLocalDate(workout.week_start);
              workoutDate.setDate(workoutDate.getDate() + workout.day_of_week);
              const workoutDateStr = getLocalDateString(workoutDate);
              const workoutType = (workout.workout_type || "").toLowerCase();

              // Use activity_date if available, fall back to start_date-derived date
              const fallback = data.find((activity) => {
                const actDate = activity.activity_date || getLocalDateString(new Date(activity.start_date));
                if (actDate !== workoutDateStr) return false;
                const activityType = (activity.activity_type || "").toLowerCase();
                return workoutType === activityType || workoutType.includes(activityType) || activityType.includes(workoutType) || workoutType === "workout";
              });

              if (fallback) {
                results.push({ ...fallback, __fallbackWorkoutId: workout.id });
              }
            }
          }
        }
      }

      const seen = new Set<string>();
      return results.filter((a) => {
        const key = `${a.id}:${a.__fallbackWorkoutId || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["training-plan", user?.id, weekStart] });
    queryClient.invalidateQueries({ queryKey: ["training-workout-goals"] });
    queryClient.invalidateQueries({ queryKey: ["training-workout-activities"] });
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

  const getMatchedActivity = (workout: TrainingPlanWorkout) => {
    // First check junction table links
    const junctionIds = activityLinks
      .filter(l => l.workout_id === workout.id)
      .map(l => l.activity_id);
    if (junctionIds.length > 0) {
      return matchedActivities.find((a: any) => a.id === junctionIds[0]) || null;
    }
    if (workout.matched_activity_id) {
      return matchedActivities.find((a: any) => a.id === workout.matched_activity_id) || null;
    }
    if (workout.matched_strava_activity_id) {
      return matchedActivities.find((a: any) => a.strava_activity_id === workout.matched_strava_activity_id) || null;
    }
    return matchedActivities.find((a: any) => a.__fallbackWorkoutId === workout.id) || null;
  };

  /** Get ALL matched activities for a workout (multi-session support) */
  const getMatchedActivities = (workout: TrainingPlanWorkout): any[] => {
    const junctionIds = activityLinks
      .filter(l => l.workout_id === workout.id)
      .sort((a, b) => a.session_order - b.session_order)
      .map(l => l.activity_id);

    if (junctionIds.length > 0) {
      return junctionIds
        .map(id => matchedActivities.find((a: any) => a.id === id))
        .filter(Boolean);
    }

    // Legacy fallback: single activity
    const single = getMatchedActivity(workout);
    return single ? [single] : [];
  };

  const deleteActivity = useMutation({
    mutationFn: async (activityId: string) => {
      if (!user) throw new Error("Not authenticated");

      // 1. Unlink any training_plan_workouts pointing to this activity
      await supabase
        .from("training_plan_workouts")
        .update({ matched_activity_id: null })
        .eq("matched_activity_id", activityId);

      // 2. Get the activity to find the storage file path
      const { data: activity } = await supabase
        .from("synced_activities")
        .select("fit_file_path")
        .eq("id", activityId)
        .eq("user_id", user.id)
        .single();

      // 3. Delete the synced_activities row (cascades to activity_laps & activity_streams)
      const { error } = await supabase
        .from("synced_activities")
        .delete()
        .eq("id", activityId)
        .eq("user_id", user.id);
      if (error) throw error;

      // 4. Delete the storage file if present
      if (activity?.fit_file_path) {
        await supabase.storage.from("fit-files").remove([activity.fit_file_path]);
      }
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["synced-activities"] });
      queryClient.invalidateQueries({ queryKey: ["activity-laps"] });
      toast({ title: "Activity deleted", description: "All associated data has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete activity", description: error.message, variant: "destructive" });
    },
  });

  return {
    workouts,
    isLoading,
    matchedActivities,
    getMatchedActivity,
    createWorkout: createWorkout.mutateAsync,
    updateWorkout: updateWorkout.mutateAsync,
    deleteWorkout: deleteWorkout.mutateAsync,
    deleteActivity: deleteActivity.mutateAsync,
    copyFromPreviousWeek: copyFromPreviousWeek.mutateAsync,
    isSaving: createWorkout.isPending || updateWorkout.isPending,
    isCreating: createWorkout.isPending,
    isCopying: copyFromPreviousWeek.isPending,
    isDeletingActivity: deleteActivity.isPending,
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

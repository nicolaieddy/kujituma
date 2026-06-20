import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useWorkoutPreferences } from "@/hooks/useWorkoutPreferences";
import { useTrainingPlan } from "@/hooks/useTrainingPlan";
import { parseLocalDate } from "@/utils/dateUtils";
import { format } from "date-fns";

/**
 * Ensures a single weekly_objective exists for the default training goal,
 * with title summarizing planned sessions/km. Updates completion based on
 * plan adherence + 90% volume.
 *
 * Runs idempotently whenever the training plan for the week changes.
 */
export function useEnsureTrainingWeeklyObjective(weekStart: string) {
  const { user } = useAuth();
  const { prefs } = useWorkoutPreferences();
  const queryClient = useQueryClient();
  const { workouts, getMatchedActivities } = useTrainingPlan(weekStart);

  const defaultGoalId = prefs.default_goal_id;
  const enabled = prefs.auto_create_weekly_objective && !!defaultGoalId;

  // Compute planned vs actual
  const nonRest = workouts.filter(
    (w) => (w.workout_type || "").toLowerCase() !== "rest",
  );
  const plannedSessions = nonRest.length;
  const plannedKm =
    nonRest.reduce((sum, w) => sum + (w.target_distance_meters || 0), 0) / 1000;

  let completedSessions = 0;
  let actualKm = 0;
  for (const w of nonRest) {
    const acts = getMatchedActivities(w as any);
    if (acts.length > 0) completedSessions++;
    for (const a of acts) actualKm += (a?.distance_meters || 0) / 1000;
  }

  const formattedWeek = (() => {
    try {
      return format(parseLocalDate(weekStart), "d MMM");
    } catch {
      return weekStart;
    }
  })();

  const desiredText = plannedKm > 0
    ? `Training week of ${formattedWeek} — ${plannedSessions} sessions / ${plannedKm.toFixed(1)} km`
    : `Training week of ${formattedWeek} — ${plannedSessions} sessions`;

  const shouldComplete =
    plannedSessions > 0 &&
    completedSessions >= plannedSessions &&
    (plannedKm === 0 || actualKm >= plannedKm * 0.9);

  useEffect(() => {
    if (!user || !enabled || plannedSessions === 0) return;
    let cancelled = false;

    (async () => {
      const { data: existing } = await supabase
        .from("weekly_objectives")
        .select("id, text, is_completed")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .eq("goal_id", defaultGoalId!)
        .ilike("text", "Training week of%")
        .maybeSingle();

      if (cancelled) return;

      if (!existing) {
        await supabase.from("weekly_objectives").insert({
          user_id: user.id,
          week_start: weekStart,
          goal_id: defaultGoalId,
          text: desiredText,
          is_completed: shouldComplete,
        });
      } else if (
        existing.text !== desiredText ||
        existing.is_completed !== shouldComplete
      ) {
        await supabase
          .from("weekly_objectives")
          .update({ text: desiredText, is_completed: shouldComplete })
          .eq("id", existing.id);
      }

      queryClient.invalidateQueries({ queryKey: ["weekly-objectives"] });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    user?.id,
    enabled,
    defaultGoalId,
    weekStart,
    desiredText,
    shouldComplete,
    plannedSessions,
    queryClient,
  ]);
}

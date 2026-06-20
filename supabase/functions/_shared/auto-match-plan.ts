// Shared auto-matching logic for training plan workouts ↔ synced Strava activities.
// Used by strava-sync (post-sync) and parse-coach-plan (post-import) so the coach
// upload behaves like the MCP `set_training_plan` tool — newly-added plan workouts
// immediately claim existing synced activities instead of leaving duplicates.

export function getDayOfWeek(localDateStr: string): number {
  const d = new Date(localDateStr + "T12:00:00");
  const jsDay = d.getDay(); // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}

const familyOf = (t: string) => {
  const s = (t || "").toLowerCase();
  if (/run|trail|treadmill/.test(s)) return "run";
  if (/ride|bike|cycle|spin/.test(s)) return "ride";
  if (/swim/.test(s)) return "swim";
  if (/hike/.test(s)) return "hike";
  if (/walk/.test(s)) return "walk";
  if (/yoga|mobility|stretch|pilates/.test(s)) return "yoga";
  if (/weight|strength|crossfit|gym|workout/.test(s)) return "strength";
  return s;
};

const typeMatches = (actType: string, planType: string) => {
  const a = (actType || "").toLowerCase();
  const p = (planType || "").toLowerCase();
  return (
    a === p ||
    (a === "run" && p === "run") ||
    (a === "weighttraining" && (p === "strength" || p === "workout")) ||
    (a === "workout" && (p === "strength" || p === "weighttraining")) ||
    p === "workout"
  );
};

export async function autoMatchTrainingPlan(
  supabase: any,
  userId: string,
  weekStarts: Set<string>,
  opts: { createUnplanned?: boolean } = {},
): Promise<number> {
  const createUnplanned = opts.createUnplanned !== false;
  if (weekStarts.size === 0) return 0;
  let matched = 0;

  for (const weekStart of weekStarts) {
    const { data: allPlanWorkouts } = await supabase
      .from("training_plan_workouts")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStart);

    const alreadyMatchedIds = new Set<number>(
      (allPlanWorkouts || [])
        .filter((w: any) => w.matched_strava_activity_id)
        .map((w: any) => w.matched_strava_activity_id),
    );

    const weekEnd = new Date(weekStart + "T00:00:00");
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const { data: activities } = await supabase
      .from("synced_activities")
      .select("*")
      .eq("user_id", userId)
      .gte("start_date", `${weekStart}T00:00:00Z`)
      .lte("start_date", `${weekEndStr}T23:59:59Z`);

    if (!activities || activities.length === 0) continue;

    const usedActivityIds = new Set<number>(alreadyMatchedIds);

    // Step 1: exact day + type
    const unmatched = (allPlanWorkouts || []).filter((w: any) => !w.matched_strava_activity_id);
    for (const workout of unmatched) {
      if ((workout.workout_type || "").toLowerCase() === "rest") continue;
      const match = activities.find((a: any) => {
        if (usedActivityIds.has(a.strava_activity_id)) return false;
        const actLocal = a.activity_date || (a.start_date || "").replace(" ", "T").split("T")[0];
        if (getDayOfWeek(actLocal) !== workout.day_of_week) return false;
        return typeMatches(a.activity_type, workout.workout_type);
      });
      if (match) {
        await supabase
          .from("training_plan_workouts")
          .update({ matched_strava_activity_id: match.strava_activity_id })
          .eq("id", workout.id);
        await supabase
          .from("training_workout_activities")
          .upsert(
            { workout_id: workout.id, activity_id: match.id, session_order: 0 },
            { onConflict: "workout_id,activity_id" },
          );
        usedActivityIds.add(match.strava_activity_id);
        matched++;
      }
    }

    // Step 1b: ±1 day drift, same sport family
    const stillUnmatched = (allPlanWorkouts || []).filter(
      (w: any) => !w.matched_strava_activity_id && (w.workout_type || "").toLowerCase() !== "rest",
    );
    for (const workout of stillUnmatched) {
      const planFam = familyOf(workout.workout_type);
      const match = activities.find((a: any) => {
        if (usedActivityIds.has(a.strava_activity_id)) return false;
        const actLocal = a.activity_date || (a.start_date || "").replace(" ", "T").split("T")[0];
        if (Math.abs(getDayOfWeek(actLocal) - workout.day_of_week) > 1) return false;
        return familyOf(a.activity_type) === planFam;
      });
      if (match) {
        await supabase
          .from("training_plan_workouts")
          .update({ matched_strava_activity_id: match.strava_activity_id })
          .eq("id", workout.id);
        await supabase
          .from("training_workout_activities")
          .upsert(
            { workout_id: workout.id, activity_id: match.id, session_order: 0 },
            { onConflict: "workout_id,activity_id" },
          );
        usedActivityIds.add(match.strava_activity_id);
        matched++;
      }
    }

    // Step 2: multi-session grouping onto already-matched workouts
    const remainingActivities: any[] = [];
    for (const activity of activities) {
      if (usedActivityIds.has(activity.strava_activity_id)) continue;
      const actLocal = activity.activity_date || (activity.start_date || "").replace(" ", "T").split("T")[0];
      const actDow = getDayOfWeek(actLocal);

      let linked = false;
      for (const workout of allPlanWorkouts || []) {
        if (workout.day_of_week !== actDow) continue;
        if (!typeMatches(activity.activity_type, workout.workout_type)) continue;

        const { data: existingLinks } = await supabase
          .from("training_workout_activities")
          .select("activity_id, session_order")
          .eq("workout_id", workout.id)
          .order("session_order", { ascending: false });
        if (!existingLinks || existingLinks.length === 0) continue;

        const last = existingLinks[0];
        const { data: lastActivity } = await supabase
          .from("synced_activities")
          .select("start_date, duration_seconds")
          .eq("id", last.activity_id)
          .single();
        if (!lastActivity) continue;

        const prevEnd = new Date(lastActivity.start_date).getTime() + (lastActivity.duration_seconds || 0) * 1000;
        const gapMs = Math.abs(new Date(activity.start_date).getTime() - prevEnd);
        if (gapMs <= 2 * 60 * 60 * 1000) {
          const nextOrder = (last.session_order ?? 0) + 1;
          await supabase
            .from("training_workout_activities")
            .upsert(
              { workout_id: workout.id, activity_id: activity.id, session_order: nextOrder },
              { onConflict: "workout_id,activity_id" },
            );
          usedActivityIds.add(activity.strava_activity_id);
          linked = true;
          matched++;
          break;
        }
      }
      if (!linked) remainingActivities.push(activity);
    }

    // Step 3: optionally create unplanned workouts for truly unmatched activities
    if (createUnplanned) {
      for (const activity of remainingActivities) {
        const actLocal = activity.activity_date || (activity.start_date || "").replace(" ", "T").split("T")[0];
        const actDow = getDayOfWeek(actLocal);
        const actType = activity.activity_type || activity.sport_type || "Workout";
        const existingForDay = (allPlanWorkouts || []).filter((w: any) => w.day_of_week === actDow);

        const { data: newWorkout } = await supabase
          .from("training_plan_workouts")
          .insert({
            user_id: userId,
            week_start: weekStart,
            day_of_week: actDow,
            workout_type: actType,
            title: activity.activity_name || actType,
            description: "",
            target_distance_meters: activity.distance_meters || null,
            target_duration_seconds: activity.duration_seconds || null,
            notes: "Auto-created from Strava activity",
            order_index: existingForDay.length,
            matched_strava_activity_id: activity.strava_activity_id,
          })
          .select("id")
          .single();
        if (newWorkout) {
          await supabase
            .from("training_workout_activities")
            .upsert(
              { workout_id: newWorkout.id, activity_id: activity.id, session_order: 0 },
              { onConflict: "workout_id,activity_id" },
            );
          usedActivityIds.add(activity.strava_activity_id);
          matched++;
        }
      }
    }

    // Step 4: sibling backfill (Strava ↔ .FIT for the same physical session)
    const allWithLinks = (allPlanWorkouts || []).filter(
      (w: any) => (w.workout_type || "").toLowerCase() !== "rest",
    );
    for (const workout of allWithLinks) {
      const { data: existingLinks } = await supabase
        .from("training_workout_activities")
        .select("activity_id, session_order")
        .eq("workout_id", workout.id)
        .order("session_order", { ascending: true });
      if (!existingLinks || existingLinks.length === 0) continue;

      const linkedIds = new Set(existingLinks.map((l: any) => l.activity_id));
      const { data: linkedActivities } = await supabase
        .from("synced_activities")
        .select("id, start_date, source, distance_meters")
        .in("id", existingLinks.map((l: any) => l.activity_id));
      if (!linkedActivities || linkedActivities.length === 0) continue;

      let nextOrder = (existingLinks[existingLinks.length - 1].session_order ?? 0) + 1;
      for (const linked of linkedActivities) {
        const { data: siblings } = await supabase
          .from("synced_activities")
          .select("id, source, distance_meters")
          .eq("user_id", userId)
          .eq("start_date", linked.start_date)
          .neq("id", linked.id);
        if (!siblings) continue;
        for (const sib of siblings) {
          if (linkedIds.has(sib.id)) continue;
          if (sib.source === linked.source) continue;
          if (sib.distance_meters && linked.distance_meters) {
            const ratio = sib.distance_meters / linked.distance_meters;
            if (ratio < 0.75 || ratio > 1.33) continue;
          }
          const { error } = await supabase
            .from("training_workout_activities")
            .upsert(
              { workout_id: workout.id, activity_id: sib.id, session_order: nextOrder },
              { onConflict: "workout_id,activity_id" },
            );
          if (!error) {
            linkedIds.add(sib.id);
            nextOrder++;
            matched++;
          }
        }
      }
    }
  }

  // Auto-link default training goal: for any workout in these weeks that has
  // at least one matched activity but no goal links yet, attach the user's
  // default training goal (if configured + auto-link is on).
  try {
    const { data: prefs } = await supabase
      .from("workout_preferences")
      .select("default_goal_id, auto_link_activities")
      .eq("user_id", userId)
      .maybeSingle();
    if (prefs?.auto_link_activities && prefs.default_goal_id) {
      const weeksArr = Array.from(weekStarts);
      const { data: weekWorkouts } = await supabase
        .from("training_plan_workouts")
        .select("id")
        .eq("user_id", userId)
        .in("week_start", weeksArr);
      const workoutIds = (weekWorkouts || []).map((w: any) => w.id);
      if (workoutIds.length > 0) {
        const [{ data: existingGoalLinks }, { data: existingActivityLinks }] = await Promise.all([
          supabase.from("training_workout_goals").select("workout_id").in("workout_id", workoutIds),
          supabase.from("training_workout_activities").select("workout_id").in("workout_id", workoutIds),
        ]);
        const hasGoal = new Set((existingGoalLinks || []).map((r: any) => r.workout_id));
        const hasActivity = new Set((existingActivityLinks || []).map((r: any) => r.workout_id));
        const toLink = workoutIds.filter((id) => hasActivity.has(id) && !hasGoal.has(id));
        if (toLink.length > 0) {
          await supabase
            .from("training_workout_goals")
            .upsert(
              toLink.map((wid) => ({ workout_id: wid, goal_id: prefs.default_goal_id })),
              { onConflict: "workout_id,goal_id" },
            );
        }
      }
    }
  } catch (err) {
    console.error("auto-link default goal failed", err);
  }

  return matched;
}

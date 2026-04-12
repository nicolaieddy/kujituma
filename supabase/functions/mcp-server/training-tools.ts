import { getMondayOfWeek, getWeekEnd, toDateStr } from "./helpers.ts";
import type { createClient } from "npm:@supabase/supabase-js@2";

type Supabase = ReturnType<typeof createClient>;
type McpServer = any;

function splitPmSessionText(text?: string | null) {
  if (!text) return null;

  const match = text.match(/\bPM\s*:/i);
  if (!match || match.index === undefined) return null;

  const primary = text.slice(0, match.index).trim().replace(/[\s–—-]+$/, "").trim();
  const secondary = text.slice(match.index + match[0].length).trim();

  if (!secondary) return null;

  return { primary, secondary };
}

function inferWorkoutType(text: string, fallback: string) {
  const normalized = text.toLowerCase();

  if (/\b(rest|off|recovery day)\b/.test(normalized)) return "Rest";
  if (/\b(run|jog|tempo|fartlek|stride|interval|marathon|easy pace)\b/.test(normalized)) return "Run";
  if (/\b(ride|bike|cycle|cycling)\b/.test(normalized)) return "Ride";
  if (/\b(swim|pool|open water)\b/.test(normalized)) return "Swim";
  if (/\b(hike|trail walk)\b/.test(normalized)) return "Hike";
  if (/\b(walk)\b/.test(normalized)) return "Walk";
  if (/\b(yoga|mobility|stretch)\b/.test(normalized)) return "Yoga";
  if (/\b(gym|core|strength|lift|weights|stability)\b/.test(normalized)) return "Workout";

  return fallback || "Workout";
}

function buildPmTitle(sourceTitle: string, pmText: string) {
  const firstSentence = pmText
    .replace(/^[\s•\-–—]+/, "")
    .split(/(?<=[.!?])\s+/)[0]
    ?.trim()
    .replace(/[.!?]$/, "");

  if (!firstSentence) return `${sourceTitle} · PM`;

  return `PM · ${firstSentence.length > 42 ? `${firstSentence.slice(0, 39).trim()}…` : firstSentence}`;
}

function expandWorkoutSessions(workout: any) {
  const descriptionSplit = splitPmSessionText(workout.description);
  const notesSplit = descriptionSplit ? null : splitPmSessionText(workout.notes);
  const pmText = descriptionSplit?.secondary || notesSplit?.secondary;

  const primaryWorkout = {
    ...workout,
    description: descriptionSplit?.primary ?? (workout.description || ""),
    notes: notesSplit?.primary ?? (workout.notes || ""),
  };

  if (!pmText) {
    return [primaryWorkout];
  }

  return [
    primaryWorkout,
    {
      ...workout,
      title: buildPmTitle(workout.title || workout.workout_type || "Workout", pmText),
      description: pmText,
      notes: "",
      workout_type: inferWorkoutType(pmText, workout.workout_type || "Workout"),
      target_distance_meters: null,
      target_duration_seconds: null,
      target_pace_per_km: null,
    },
  ];
}

export function registerTrainingReadTools(mcp: McpServer, supabase: Supabase, userId: string) {
  mcp.tool("get_training_plan", {
    description: "Get planned workouts for a week with matched Strava actual data. Returns all enriched fields (distance, pace, HR, elevation, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        week_start: { type: "string", description: "YYYY-MM-DD Monday. Defaults to current week." },
      },
    },
    handler: async ({ week_start }: { week_start?: string }) => {
      const weekKey = week_start || getMondayOfWeek(new Date());

      const { data: workouts, error } = await supabase
        .from("training_plan_workouts")
        .select("*")
        .eq("user_id", userId)
        .eq("week_start", weekKey)
        .order("day_of_week")
        .order("order_index");

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!workouts || workouts.length === 0) {
        return { content: [{ type: "text" as const, text: `No training plan for week ${weekKey}` }] };
      }

      const matchedIds = workouts
        .filter((w: any) => w.matched_strava_activity_id)
        .map((w: any) => w.matched_strava_activity_id);

      let activities: any[] = [];
      if (matchedIds.length > 0) {
        const { data } = await supabase
          .from("synced_activities")
          .select("*")
          .in("strava_activity_id", matchedIds);
        activities = data || [];
      }

      const activityMap = new Map(activities.map((a: any) => [a.strava_activity_id, a]));
      const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

      const result = workouts.map((w: any) => {
        const actual = activityMap.get(w.matched_strava_activity_id);
        return {
          day: dayLabels[w.day_of_week],
          title: w.title,
          workout_type: w.workout_type,
          description: w.description,
          notes: w.notes,
          planned: {
            distance_meters: w.target_distance_meters,
            duration_seconds: w.target_duration_seconds,
            pace_per_km: w.target_pace_per_km,
          },
          actual: actual ? {
            activity_name: actual.activity_name,
            distance_meters: actual.distance_meters,
            duration_seconds: actual.duration_seconds,
            elapsed_time_seconds: actual.elapsed_time_seconds,
            average_speed: actual.average_speed,
            max_speed: actual.max_speed,
            average_heartrate: actual.average_heartrate,
            max_heartrate: actual.max_heartrate,
            total_elevation_gain: actual.total_elevation_gain,
            calories: actual.calories,
            suffer_score: actual.suffer_score,
            average_cadence: actual.average_cadence,
            strava_activity_id: actual.strava_activity_id,
          } : null,
          status: actual ? "completed" : "pending",
        };
      });

      const completed = result.filter((r: any) => r.status === "completed").length;
      return {
        content: [{
          type: "text" as const,
          text: `Training Plan for ${weekKey}: ${completed}/${result.length} completed\n\n${JSON.stringify(result, null, 2)}`,
        }],
      };
    },
  });

  mcp.tool("get_training_history", {
    description: "Get training plan vs actual data across multiple weeks for trend analysis.",
    inputSchema: {
      type: "object",
      properties: {
        weeks: { type: "number", description: "Number of weeks to look back. Default 4." },
        goal_id: { type: "string", description: "Optional: filter by goal ID." },
      },
    },
    handler: async ({ weeks, goal_id }: { weeks?: number; goal_id?: string }) => {
      const numWeeks = weeks || 4;
      const now = new Date();
      const mondays: string[] = [];
      for (let i = 0; i < numWeeks; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        mondays.push(getMondayOfWeek(d));
      }

      let query = supabase
        .from("training_plan_workouts")
        .select("*")
        .eq("user_id", userId)
        .in("week_start", mondays)
        .order("week_start", { ascending: false })
        .order("day_of_week")
        .order("order_index");

      if (goal_id) query = query.eq("goal_id", goal_id);

      const { data: workouts, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

      const matchedIds = (workouts || [])
        .filter((w: any) => w.matched_strava_activity_id)
        .map((w: any) => w.matched_strava_activity_id);

      let activities: any[] = [];
      if (matchedIds.length > 0) {
        const { data } = await supabase
          .from("synced_activities")
          .select("*")
          .in("strava_activity_id", matchedIds);
        activities = data || [];
      }

      const activityMap = new Map(activities.map((a: any) => [a.strava_activity_id, a]));
      const weeklyData: Record<string, any> = {};
      for (const w of (workouts || [])) {
        if (!weeklyData[w.week_start]) {
          weeklyData[w.week_start] = { planned: 0, completed: 0, total_planned_distance: 0, total_actual_distance: 0, workouts: [] };
        }
        const wd = weeklyData[w.week_start];
        wd.planned++;
        const actual = activityMap.get(w.matched_strava_activity_id);
        if (actual) {
          wd.completed++;
          wd.total_actual_distance += actual.distance_meters || 0;
        }
        wd.total_planned_distance += w.target_distance_meters || 0;
        wd.workouts.push({
          title: w.title,
          type: w.workout_type,
          planned_distance: w.target_distance_meters,
          actual_distance: actual?.distance_meters || null,
          actual_hr: actual?.average_heartrate || null,
          status: actual ? "completed" : "missed",
        });
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(weeklyData, null, 2),
        }],
      };
    },
  });

  mcp.tool("get_activity_details", {
    description: "Get full enriched data for a specific synced activity by its database ID or Strava activity ID. Supports both Strava-synced and .fit-uploaded activities.",
    inputSchema: {
      type: "object",
      properties: {
        activity_id: { type: "string", description: "Database UUID of the activity" },
        strava_activity_id: { type: "number", description: "Strava activity ID (alternative lookup)" },
      },
    },
    handler: async ({ activity_id, strava_activity_id }: { activity_id?: string; strava_activity_id?: number }) => {
      if (!activity_id && !strava_activity_id) {
        return { content: [{ type: "text" as const, text: "Provide either activity_id or strava_activity_id" }] };
      }

      let query = supabase.from("synced_activities").select("*").eq("user_id", userId);
      if (activity_id) query = query.eq("id", activity_id);
      else query = query.eq("strava_activity_id", strava_activity_id!);

      const { data, error } = await query.single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  });

  mcp.tool("get_activity_laps", {
    description: "Get per-lap split data for an activity. Returns distance, duration, HR, pace, cadence, power per lap.",
    inputSchema: {
      type: "object",
      properties: {
        activity_id: { type: "string", description: "Database UUID of the synced activity" },
      },
      required: ["activity_id"],
    },
    handler: async ({ activity_id }: { activity_id: string }) => {
      const { data, error } = await supabase
        .from("activity_laps")
        .select("*")
        .eq("activity_id", activity_id)
        .eq("user_id", userId)
        .order("lap_index");

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data?.length) return { content: [{ type: "text" as const, text: "No lap data for this activity." }] };

      const lines = data.map((lap: any) => {
        const parts = [`Lap ${lap.lap_index + 1}`];
        if (lap.distance_meters) parts.push(`${(lap.distance_meters / 1000).toFixed(2)}km`);
        if (lap.duration_seconds) {
          const m = Math.floor(lap.duration_seconds / 60);
          const s = Math.round(lap.duration_seconds % 60);
          parts.push(`${m}:${s.toString().padStart(2, "0")}`);
        }
        if (lap.avg_heart_rate) parts.push(`HR:${Math.round(lap.avg_heart_rate)}`);
        if (lap.avg_speed) {
          const paceTotal = 1000 / lap.avg_speed;
          const pm = Math.floor(paceTotal / 60);
          const ps = Math.round(paceTotal % 60);
          parts.push(`Pace:${pm}:${ps.toString().padStart(2, "0")}/km`);
        }
        if (lap.avg_power) parts.push(`Power:${Math.round(lap.avg_power)}W`);
        if (lap.avg_ground_contact_time) parts.push(`GCT:${Math.round(lap.avg_ground_contact_time)}ms`);
        if (lap.avg_stride_length) parts.push(`Stride:${lap.avg_stride_length.toFixed(2)}m`);
        if (lap.avg_vertical_oscillation) parts.push(`VO:${lap.avg_vertical_oscillation.toFixed(1)}cm`);
        if (lap.avg_temperature) parts.push(`Temp:${lap.avg_temperature}°C`);
        return parts.join(" | ");
      });

      return {
        content: [{
          type: "text" as const,
          text: `${data.length} laps:\n${lines.join("\n")}\n\nFull data:\n${JSON.stringify(data, null, 2)}`,
        }],
      };
    },
  });
}

export function registerTrainingWriteTools(mcp: McpServer, supabase: Supabase, userId: string) {
  mcp.tool("set_training_plan", {
    description: "Create or replace training plan workouts for a week. Provide an array of workouts.",
    inputSchema: {
      type: "object",
      properties: {
        week_start: { type: "string", description: "YYYY-MM-DD Monday. Defaults to current week." },
        goal_id: { type: "string", description: "Optional goal ID to link the plan to." },
        workouts: {
          type: "array",
          description: "Array of workout objects",
          items: {
            type: "object",
            properties: {
              day_of_week: { type: "number", description: "0=Mon, 6=Sun" },
              workout_type: { type: "string", description: "Run, Ride, Swim, etc." },
              title: { type: "string", description: "e.g. Tempo Run" },
              description: { type: "string", description: "Coach instructions" },
              target_distance_meters: { type: "number" },
              target_duration_seconds: { type: "number" },
              target_pace_per_km: { type: "number", description: "Seconds per km" },
              notes: { type: "string" },
            },
            required: ["day_of_week", "workout_type", "title"],
          },
        },
        replace: { type: "boolean", description: "If true, delete existing workouts for the week first. Default true." },
      },
      required: ["workouts"],
    },
    handler: async ({ week_start, goal_id, workouts, replace }: {
      week_start?: string;
      goal_id?: string;
      workouts: any[];
      replace?: boolean;
    }) => {
      const weekKey = week_start || getMondayOfWeek(new Date());
      const shouldReplace = replace !== false;

      if (shouldReplace) {
        await supabase
          .from("training_plan_workouts")
          .delete()
          .eq("user_id", userId)
          .eq("week_start", weekKey);
      }

      const expandedWorkouts = workouts.flatMap((workout: any) => expandWorkoutSessions(workout));

      const rows = expandedWorkouts.map((w: any, i: number) => ({
        user_id: userId,
        week_start: weekKey,
        goal_id: goal_id || null,
        day_of_week: w.day_of_week,
        workout_type: w.workout_type,
        title: w.title || w.workout_type,
        description: w.description || "",
        target_distance_meters: w.target_distance_meters || null,
        target_duration_seconds: w.target_duration_seconds || null,
        target_pace_per_km: w.target_pace_per_km || null,
        notes: w.notes || "",
        order_index: i,
      }));

      const { error } = await supabase.from("training_plan_workouts").insert(rows);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

      return {
        content: [{
          type: "text" as const,
          text: `✅ Set ${rows.length} workouts for week ${weekKey}`,
        }],
      };
    },
  });

  mcp.tool("match_workout", {
    description: "Manually match a training plan workout to a Strava activity.",
    inputSchema: {
      type: "object",
      properties: {
        workout_id: { type: "string", description: "Training plan workout UUID" },
        strava_activity_id: { type: "number", description: "Strava activity ID to match" },
      },
      required: ["workout_id", "strava_activity_id"],
    },
    handler: async ({ workout_id, strava_activity_id }: { workout_id: string; strava_activity_id: number }) => {
      const { error } = await supabase
        .from("training_plan_workouts")
        .update({ matched_strava_activity_id: strava_activity_id })
        .eq("id", workout_id)
        .eq("user_id", userId);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `✅ Matched workout ${workout_id} to Strava activity ${strava_activity_id}` }] };
    },
  });

  mcp.tool("get_workout_preferences", {
    description: "Get the user's workout display preferences (units, pace format, etc.)",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const { data, error } = await supabase
        .from("workout_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data) return { content: [{ type: "text" as const, text: "No preferences set (using defaults: km, min/km, meters, celsius, kg, watts)" }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  });
}

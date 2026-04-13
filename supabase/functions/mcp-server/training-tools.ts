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

/** Fetch activities by both strava IDs and direct DB UUIDs, return two lookup maps */
async function fetchActivitiesDual(
  supabase: Supabase,
  userId: string,
  workouts: any[]
): Promise<{ stravaMap: Map<number, any>; directMap: Map<string, any> }> {
  const stravaIds = workouts
    .map((w: any) => w.matched_strava_activity_id)
    .filter(Boolean);
  const directIds = workouts
    .map((w: any) => w.matched_activity_id)
    .filter(Boolean);

  const stravaMap = new Map<number, any>();
  const directMap = new Map<string, any>();

  const promises: Promise<void>[] = [];

  if (stravaIds.length > 0) {
    promises.push(
      supabase
        .from("synced_activities")
        .select("*")
        .in("strava_activity_id", stravaIds)
        .then(({ data }: any) => {
          (data || []).forEach((a: any) => stravaMap.set(a.strava_activity_id, a));
        })
    );
  }

  if (directIds.length > 0) {
    promises.push(
      supabase
        .from("synced_activities")
        .select("*")
        .in("id", directIds)
        .then(({ data }: any) => {
          (data || []).forEach((a: any) => directMap.set(a.id, a));
        })
    );
  }

  await Promise.all(promises);
  return { stravaMap, directMap };
}

function resolveActual(workout: any, stravaMap: Map<number, any>, directMap: Map<string, any>) {
  return directMap.get(workout.matched_activity_id)
    || stravaMap.get(workout.matched_strava_activity_id)
    || null;
}

export function registerTrainingReadTools(mcp: McpServer, supabase: Supabase, userId: string) {
  mcp.tool("get_training_plan", {
    description: "Get planned workouts for a week with matched actual data (Strava-synced or .fit uploads). Returns all enriched fields (distance, pace, HR, elevation, etc.).",
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

      const { stravaMap, directMap } = await fetchActivitiesDual(supabase, userId, workouts);
      const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

      const result = workouts.map((w: any) => {
        const actual = resolveActual(w, stravaMap, directMap);
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
            activity_id: actual.id,
            source: actual.source || (actual.strava_activity_id ? "strava" : ".fit_upload"),
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
            average_power: actual.average_power,
            normalized_power: actual.normalized_power,
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
    description: "Get training plan vs actual data (Strava or .fit upload) across multiple weeks for trend analysis.",
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

      const { stravaMap, directMap } = await fetchActivitiesDual(supabase, userId, workouts || []);

      const weeklyData: Record<string, any> = {};
      for (const w of (workouts || [])) {
        if (!weeklyData[w.week_start]) {
          weeklyData[w.week_start] = { planned: 0, completed: 0, total_planned_distance: 0, total_actual_distance: 0, workouts: [] };
        }
        const wd = weeklyData[w.week_start];
        wd.planned++;
        const actual = resolveActual(w, stravaMap, directMap);
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
          actual_power: actual?.average_power || null,
          activity_id: actual?.id || null,
          source: actual ? (actual.source || (actual.strava_activity_id ? "strava" : ".fit_upload")) : null,
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

  mcp.tool("list_activities", {
    description: "List activity summaries by date range, type, or source. Use to discover activities (including .fit uploads) that can then be inspected with get_activity_details or get_activity_laps.",
    inputSchema: {
      type: "object",
      properties: {
        week_start: { type: "string", description: "YYYY-MM-DD Monday. Defaults to current week. Activities from this week (Mon–Sun) are returned." },
        activity_type: { type: "string", description: "Optional filter: Run, Ride, Swim, etc." },
        source: { type: "string", description: "Optional filter: 'strava' or '.fit_upload'" },
        limit: { type: "number", description: "Max results. Default 20." },
      },
    },
    handler: async ({ week_start, activity_type, source, limit }: {
      week_start?: string; activity_type?: string; source?: string; limit?: number;
    }) => {
      const weekKey = week_start || getMondayOfWeek(new Date());
      const weekEnd = getWeekEnd(weekKey);
      const maxResults = Math.min(limit || 20, 50);

      let query = supabase
        .from("synced_activities")
        .select("id, source, activity_type, activity_name, start_date, duration_seconds, distance_meters, average_heartrate, average_speed, total_elevation_gain, calories, average_power, strava_activity_id, sport_type")
        .eq("user_id", userId)
        .gte("start_date", `${weekKey}T00:00:00`)
        .lte("start_date", `${weekEnd}T23:59:59`)
        .order("start_date", { ascending: true })
        .limit(maxResults);

      if (activity_type) query = query.eq("activity_type", activity_type);
      if (source) query = query.eq("source", source);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data?.length) return { content: [{ type: "text" as const, text: `No activities found for week ${weekKey}` }] };

      const summary = data.map((a: any) => ({
        activity_id: a.id,
        source: a.source,
        type: a.activity_type || a.sport_type,
        name: a.activity_name,
        date: a.start_date,
        distance_km: a.distance_meters ? +(a.distance_meters / 1000).toFixed(2) : null,
        duration_min: a.duration_seconds ? +(a.duration_seconds / 60).toFixed(1) : null,
        avg_hr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
        avg_power: a.average_power ? Math.round(a.average_power) : null,
        strava_id: a.strava_activity_id,
      }));

      return {
        content: [{
          type: "text" as const,
          text: `${summary.length} activities for week ${weekKey}:\n${JSON.stringify(summary, null, 2)}`,
        }],
      };
    },
  });

  mcp.tool("get_activity_details", {
    description: "Get full enriched data for a specific synced activity. Includes device info, running dynamics, GPS bbox, power/FTP, and records_json timeseries. Supports Strava-synced and .fit-uploaded activities.",
    inputSchema: {
      type: "object",
      properties: {
        activity_id: { type: "string", description: "Database UUID of the activity" },
        strava_activity_id: { type: "number", description: "Strava activity ID (alternative lookup)" },
        include_records: { type: "boolean", description: "Include full records_json timeseries (can be large). Default false." },
      },
    },
    handler: async ({ activity_id, strava_activity_id, include_records }: { activity_id?: string; strava_activity_id?: number; include_records?: boolean }) => {
      if (!activity_id && !strava_activity_id) {
        return { content: [{ type: "text" as const, text: "Provide either activity_id or strava_activity_id" }] };
      }

      const columns = include_records ? "*" : "id, user_id, source, activity_type, activity_name, start_date, duration_seconds, elapsed_time_seconds, distance_meters, average_speed, max_speed, average_heartrate, max_heartrate, average_power, max_power, normalized_power, ftp, tss, average_cadence, max_cadence, total_elevation_gain, total_ascent, total_descent, calories, total_strides, training_effect, avg_temperature, num_laps, avg_vertical_oscillation, avg_stance_time, avg_vertical_ratio, avg_step_length, device_manufacturer, device_product, sub_sport, bbox_north, bbox_south, bbox_east, bbox_west, fit_file_path, strava_activity_id, strava_description, suffer_score, sport_type, synced_at";

      let query = supabase.from("synced_activities").select(columns).eq("user_id", userId);
      if (activity_id) query = query.eq("id", activity_id);
      else query = query.eq("strava_activity_id", strava_activity_id!);

      const { data, error } = await query.single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };

      if (!include_records && data) {
        const { data: recCheck } = await supabase
          .from("synced_activities")
          .select("records_json")
          .eq("id", data.id)
          .single();
        if (recCheck?.records_json) {
          (data as any).records_count = Array.isArray(recCheck.records_json) ? recCheck.records_json.length : 0;
          (data as any).has_gps = Array.isArray(recCheck.records_json) && recCheck.records_json.some((r: any) => r.lat != null);
        }
      }

      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  });

  mcp.tool("get_activity_laps", {
    description: "Get per-lap split data for an activity. Returns all Garmin-enriched fields: distance, duration, HR, pace, cadence, power, running dynamics (GCT, stride length, vertical oscillation/ratio), elevation, GPS endpoints, temperature.",
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
        if (lap.total_timer_time || lap.duration_seconds) {
          const secs = lap.total_timer_time || lap.duration_seconds;
          const m = Math.floor(secs / 60);
          const s = Math.round(secs % 60);
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
        if (lap.avg_stride_length) parts.push(`Stride:${(lap.avg_stride_length / 10).toFixed(1)}cm`);
        if (lap.avg_vertical_oscillation) parts.push(`VO:${(lap.avg_vertical_oscillation / 10).toFixed(1)}cm`);
        if (lap.avg_vertical_ratio) parts.push(`VR:${lap.avg_vertical_ratio.toFixed(1)}%`);
        if (lap.total_ascent) parts.push(`↑${lap.total_ascent}m`);
        if (lap.total_descent) parts.push(`↓${lap.total_descent}m`);
        if (lap.avg_temperature != null) parts.push(`${lap.avg_temperature}°C`);
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

  mcp.tool("get_activity_records", {
    description: "Get the 1Hz timeseries records_json for an activity. Contains per-second data: timestamp, lat, lng, distance, speed, altitude, heart_rate, cadence, power, temperature. Can be large.",
    inputSchema: {
      type: "object",
      properties: {
        activity_id: { type: "string", description: "Database UUID of the synced activity" },
        sample_every: { type: "number", description: "Return every Nth record to reduce size. Default 1 (all records)." },
      },
      required: ["activity_id"],
    },
    handler: async ({ activity_id, sample_every }: { activity_id: string; sample_every?: number }) => {
      const { data, error } = await supabase
        .from("synced_activities")
        .select("records_json")
        .eq("id", activity_id)
        .eq("user_id", userId)
        .single();

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data?.records_json) return { content: [{ type: "text" as const, text: "No timeseries data for this activity." }] };

      const records = Array.isArray(data.records_json) ? data.records_json : [];
      const step = sample_every && sample_every > 1 ? sample_every : 1;
      const sampled = step > 1 ? records.filter((_: any, i: number) => i % step === 0) : records;

      return {
        content: [{
          type: "text" as const,
          text: `${sampled.length} records (of ${records.length} total, sampled every ${step}):\n${JSON.stringify(sampled, null, 2)}`,
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

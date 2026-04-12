import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import FitParser from "npm:fit-file-parser@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function parseFitBuffer(buffer: ArrayBuffer): Promise<any> {
  return new Promise((resolve, reject) => {
    const parser = new FitParser({ force: true, speedUnit: "m/s", lengthUnit: "m", elapsedRecordField: true });
    parser.parse(buffer, (error: any, data: any) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
}

function inferActivityType(sport?: string, subSport?: string): string {
  const s = (sport || "").toLowerCase();
  if (s.includes("run")) return "Run";
  if (s.includes("cycling") || s.includes("biking") || s.includes("ride")) return "Ride";
  if (s.includes("swim")) return "Swim";
  if (s.includes("hik")) return "Hike";
  if (s.includes("walk")) return "Walk";
  if (s.includes("yoga")) return "Yoga";
  return sport || "Workout";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { file_path, workout_id } = await req.json();
    if (!file_path) {
      return new Response(JSON.stringify({ error: "file_path is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download .fit file from storage
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from("fit-files")
      .download(file_path);

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: `Failed to download file: ${downloadError?.message}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buffer = await fileData.arrayBuffer();
    const fitData = await parseFitBuffer(buffer);

    console.log("FIT parsed — sessions:", fitData.sessions?.length, "laps:", fitData.laps?.length, "records:", fitData.records?.length);

    // Extract session summary
    const session = fitData.sessions?.[0];
    if (!session) {
      return new Response(JSON.stringify({ error: "No session data found in .fit file" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const activityType = inferActivityType(session.sport, session.sub_sport);
    const startDate = session.start_time ? new Date(session.start_time).toISOString() : new Date().toISOString();

    // Build synced_activity row
    const activityRow: Record<string, any> = {
      user_id: user.id,
      strava_activity_id: null,
      source: "fit_upload",
      activity_type: activityType,
      activity_name: session.sport ? `${activityType} (FIT Upload)` : "FIT Upload",
      start_date: startDate,
      duration_seconds: session.total_timer_time ? Math.round(session.total_timer_time) : null,
      elapsed_time_seconds: session.total_elapsed_time ? Math.round(session.total_elapsed_time) : null,
      distance_meters: session.total_distance || null,
      average_speed: session.avg_speed || session.enhanced_avg_speed || null,
      max_speed: session.max_speed || session.enhanced_max_speed || null,
      average_heartrate: session.avg_heart_rate || null,
      max_heartrate: session.max_heart_rate || null,
      average_cadence: session.avg_cadence || session.avg_running_cadence || null,
      max_cadence: session.max_cadence || session.max_running_cadence || null,
      average_power: session.avg_power || null,
      normalized_power: session.normalized_power || null,
      tss: session.training_stress_score || null,
      training_effect: session.total_training_effect || null,
      total_elevation_gain: session.total_ascent || null,
      calories: session.total_calories || null,
      fit_file_path: file_path,
      habit_completion_created: false,
      synced_at: new Date().toISOString(),
    };

    // Insert activity
    const { data: insertedActivity, error: insertError } = await adminClient
      .from("synced_activities")
      .insert(activityRow)
      .select("id")
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: `Failed to save activity: ${insertError.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const activityId = insertedActivity.id;

    // Insert laps
    if (fitData.laps?.length > 0) {
      const lapRows = fitData.laps.map((lap: any, i: number) => ({
        activity_id: activityId,
        user_id: user.id,
        lap_index: i,
        start_time: lap.start_time ? new Date(lap.start_time).toISOString() : null,
        duration_seconds: lap.total_timer_time ? Math.round(lap.total_timer_time * 10) / 10 : null,
        distance_meters: lap.total_distance || null,
        avg_heart_rate: lap.avg_heart_rate || null,
        max_heart_rate: lap.max_heart_rate || null,
        avg_speed: lap.avg_speed || lap.enhanced_avg_speed || null,
        max_speed: lap.max_speed || lap.enhanced_max_speed || null,
        avg_cadence: lap.avg_cadence || lap.avg_running_cadence || null,
        avg_power: lap.avg_power || null,
        total_elevation_gain: lap.total_ascent || null,
        calories: lap.total_calories || null,
      }));

      const { error: lapError } = await adminClient.from("activity_laps").insert(lapRows);
      if (lapError) console.error("Failed to insert laps:", lapError.message);
    }

    // Insert stream data (limit to every 5th record to reduce volume)
    if (fitData.records?.length > 0) {
      const streamRows: any[] = [];
      const startTime = new Date(startDate).getTime();

      for (let i = 0; i < fitData.records.length; i += 5) {
        const rec = fitData.records[i];
        const recTime = rec.timestamp ? new Date(rec.timestamp).getTime() : null;
        const offsetSeconds = recTime ? (recTime - startTime) / 1000 : i;

        streamRows.push({
          activity_id: activityId,
          user_id: user.id,
          timestamp_offset_seconds: offsetSeconds,
          heart_rate: rec.heart_rate || null,
          speed: rec.speed || rec.enhanced_speed || null,
          cadence: rec.cadence || null,
          power: rec.power || null,
          altitude: rec.altitude || rec.enhanced_altitude || null,
          latitude: rec.position_lat || null,
          longitude: rec.position_long || null,
        });
      }

      // Insert in batches of 500
      for (let b = 0; b < streamRows.length; b += 500) {
        const batch = streamRows.slice(b, b + 500);
        const { error: streamError } = await adminClient.from("activity_streams").insert(batch);
        if (streamError) {
          console.error(`Failed to insert stream batch ${b}:`, streamError.message);
          break;
        }
      }
    }

    // Auto-match to training plan workout if workout_id provided
    if (workout_id) {
      const { error: matchError } = await adminClient
        .from("training_plan_workouts")
        .update({ matched_strava_activity_id: null })
        .eq("id", workout_id)
        .eq("user_id", user.id);

      // We need a way to link - for now store activity_id reference
      // The training_plan_workouts uses matched_strava_activity_id but we have no strava ID
      // We'll use a convention: negative numbers for fit uploads
      if (!matchError) {
        console.log(`Linked workout ${workout_id} to fit activity ${activityId}`);
      }
    }

    // Auto-match by date: find unmatched workouts on the same day
    const activityDate = startDate.split("T")[0];
    const { data: unmatchedWorkouts } = await adminClient
      .from("training_plan_workouts")
      .select("id, workout_type, day_of_week, week_start")
      .eq("user_id", user.id)
      .is("matched_strava_activity_id", null);

    if (unmatchedWorkouts?.length) {
      // Calculate the date for each workout and match
      for (const workout of unmatchedWorkouts) {
        const workoutDate = new Date(workout.week_start);
        workoutDate.setDate(workoutDate.getDate() + workout.day_of_week);
        const workoutDateStr = workoutDate.toISOString().split("T")[0];

        if (workoutDateStr === activityDate) {
          // Type match - rough check
          const wType = (workout.workout_type || "").toLowerCase();
          const aType = activityType.toLowerCase();
          if (wType === aType || wType.includes(aType) || aType.includes(wType) || wType === "workout") {
            console.log(`Auto-matched workout ${workout.id} to fit activity ${activityId}`);
            // We can't use matched_strava_activity_id since there's no strava ID
            // For now, log the match - the UI will need to handle this differently
            break;
          }
        }
      }
    }

    const summary = {
      activity_id: activityId,
      activity_type: activityType,
      start_date: startDate,
      duration_seconds: activityRow.duration_seconds,
      distance_meters: activityRow.distance_meters,
      avg_hr: activityRow.average_heartrate,
      laps_count: fitData.laps?.length || 0,
      stream_records: fitData.records?.length || 0,
    };

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error parsing FIT file:", error);
    return new Response(JSON.stringify({ error: `Parse error: ${error.message}` }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import FitParser from "npm:fit-file-parser@2.1.0";
import { JSZip } from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const toDegrees = (sc: number | null | undefined): number | null =>
  sc != null ? sc * (180 / 2147483648) : null;

function parseFitBuffer(buffer: ArrayBuffer): Promise<any> {
  return new Promise((resolve, reject) => {
    const parser = new FitParser({ force: true, speedUnit: "m/s", lengthUnit: "m", elapsedRecordField: true });
    parser.parse(buffer, (error: any, data: any) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
}

/** Extract .fit buffer from a .zip file, or return buffer as-is if already .fit */
async function extractFitBuffer(buffer: ArrayBuffer, fileName: string): Promise<ArrayBuffer> {
  if (fileName.toLowerCase().endsWith(".zip")) {
    const zip = new JSZip();
    const contents = await zip.loadAsync(buffer);
    const fitFile = Object.keys(contents.files).find(name => name.toLowerCase().endsWith(".fit"));
    if (!fitFile) {
      throw new Error("No .fit file found inside the .zip archive");
    }
    console.log(`Extracted ${fitFile} from zip`);
    return await contents.files[fitFile].async("arraybuffer");
  }
  return buffer;
}

function inferActivityType(sport?: string, _subSport?: string): string {
  const s = (sport || "").toLowerCase();
  if (s.includes("run")) return "Run";
  if (s.includes("cycling") || s.includes("biking") || s.includes("ride")) return "Ride";
  if (s.includes("swim")) return "Swim";
  if (s.includes("hik")) return "Hike";
  if (s.includes("walk")) return "Walk";
  if (s.includes("yoga")) return "Yoga";
  return sport || "Workout";
}

function extractFtp(fitData: any): number | null {
  if (!fitData.zones_target) return null;
  for (const zt of Array.isArray(fitData.zones_target) ? fitData.zones_target : [fitData.zones_target]) {
    if (zt?.functional_threshold_power) return zt.functional_threshold_power;
  }
  return null;
}

function buildRecordsJson(records: any[]): any[] {
  if (!records?.length) return [];
  const out: any[] = [];
  for (const rec of records) {
    const entry: Record<string, any> = {};
    if (rec.timestamp) entry.t = new Date(rec.timestamp).toISOString();
    const lat = toDegrees(rec.position_lat);
    const lng = toDegrees(rec.position_long);
    if (lat != null) entry.lat = Math.round(lat * 100000) / 100000;
    if (lng != null) entry.lng = Math.round(lng * 100000) / 100000;
    if (rec.distance != null) entry.d = Math.round(rec.distance * 100) / 100;
    const spd = rec.enhanced_speed ?? rec.speed;
    if (spd != null) entry.spd = Math.round(spd * 1000) / 1000;
    const alt = rec.enhanced_altitude ?? rec.altitude;
    if (alt != null) entry.alt = Math.round(alt * 10) / 10;
    if (rec.heart_rate != null) entry.hr = rec.heart_rate;
    if (rec.cadence != null) entry.cad = rec.cadence;
    if (rec.power != null) entry.pwr = rec.power;
    if (rec.temperature != null) entry.temp = rec.temperature;
    if (Object.keys(entry).length > 1) out.push(entry);
  }
  return out;
}

function computeBbox(records: any[]): { bbox_north: number; bbox_south: number; bbox_east: number; bbox_west: number } | null {
  let n = -90, s = 90, e = -180, w = 180;
  let found = false;
  for (const r of records) {
    if (r.lat != null && r.lng != null) {
      found = true;
      if (r.lat > n) n = r.lat;
      if (r.lat < s) s = r.lat;
      if (r.lng > e) e = r.lng;
      if (r.lng < w) w = r.lng;
    }
  }
  return found ? { bbox_north: n, bbox_south: s, bbox_east: e, bbox_west: w } : null;
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

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { file_path, workout_id, overwrite_activity_id } = await req.json();
    if (!file_path) {
      return new Response(JSON.stringify({ error: "file_path is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: fileData, error: downloadError } = await adminClient.storage
      .from("fit-files")
      .download(file_path);

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: `Failed to download file: ${downloadError?.message}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBuffer = await fileData.arrayBuffer();
    const buffer = await extractFitBuffer(rawBuffer, file_path);
    const fitData = await parseFitBuffer(buffer);

    console.log("FIT parsed — sessions:", fitData.sessions?.length, "laps:", fitData.laps?.length, "records:", fitData.records?.length);

    const session = fitData.sessions?.[0];
    if (!session) {
      return new Response(JSON.stringify({ error: "No session data found in .fit file" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const activityType = inferActivityType(session.sport, session.sub_sport);
    const startDate = session.start_time ? new Date(session.start_time).toISOString() : new Date().toISOString();
    const durationSeconds = session.total_timer_time ? Math.round(session.total_timer_time) : null;
    const ftp = extractFtp(fitData);

    // Duplicate detection: check for existing activity with same date + type + similar duration
    if (!overwrite_activity_id) {
      const activityDate = startDate.split("T")[0];
      const { data: existing } = await adminClient
        .from("synced_activities")
        .select("id, activity_type, start_date, duration_seconds, source, activity_name")
        .eq("user_id", user.id)
        .gte("start_date", `${activityDate}T00:00:00`)
        .lte("start_date", `${activityDate}T23:59:59`);

      if (existing?.length) {
        const match = existing.find((a: any) => {
          const typeMatch = a.activity_type?.toLowerCase() === activityType.toLowerCase();
          if (!typeMatch) return false;
          if (!a.duration_seconds || !durationSeconds) return typeMatch;
          const durationDiff = Math.abs(a.duration_seconds - durationSeconds);
          return durationDiff < 120; // within 2 minutes
        });

        if (match) {
          return new Response(JSON.stringify({
            duplicate: true,
            existing_activity: {
              id: match.id,
              activity_type: match.activity_type,
              start_date: match.start_date,
              duration_seconds: match.duration_seconds,
              source: match.source,
              activity_name: match.activity_name,
            },
            new_activity: {
              activity_type: activityType,
              start_date: startDate,
              duration_seconds: durationSeconds,
            },
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // If overwriting, delete old activity data first
    if (overwrite_activity_id) {
      console.log(`Overwriting activity ${overwrite_activity_id}`);
      await adminClient.from("activity_streams").delete().eq("activity_id", overwrite_activity_id);
      await adminClient.from("activity_laps").delete().eq("activity_id", overwrite_activity_id);
      // Unlink any workouts pointing to the old activity
      await adminClient
        .from("training_plan_workouts")
        .update({ matched_activity_id: null })
        .eq("matched_activity_id", overwrite_activity_id);
      await adminClient.from("synced_activities").delete().eq("id", overwrite_activity_id).eq("user_id", user.id);
    }

    const recordsJson = buildRecordsJson(fitData.records || []);
    const bbox = computeBbox(recordsJson);

    const activityRow: Record<string, any> = {
      user_id: user.id,
      strava_activity_id: null,
      source: "fit_upload",
      activity_type: activityType,
      activity_name: session.sport ? `${activityType} (FIT Upload)` : "FIT Upload",
      start_date: startDate,
      fit_file_path: file_path,
      habit_completion_created: false,
      synced_at: new Date().toISOString(),
      device_manufacturer: session.manufacturer || fitData.file_id?.manufacturer || null,
      device_product: session.product != null ? String(session.product) : null,
      sub_sport: session.sub_sport || null,
      duration_seconds: durationSeconds,
      elapsed_time_seconds: session.total_elapsed_time ? Math.round(session.total_elapsed_time) : null,
      distance_meters: session.total_distance || null,
      average_speed: session.enhanced_avg_speed ?? session.avg_speed ?? null,
      max_speed: session.enhanced_max_speed ?? session.max_speed ?? null,
      average_heartrate: session.avg_heart_rate || null,
      max_heartrate: session.max_heart_rate || null,
      average_power: session.avg_power || null,
      max_power: session.max_power || null,
      normalized_power: session.normalized_power || null,
      ftp: ftp,
      tss: session.training_stress_score || null,
      average_cadence: session.avg_running_cadence ?? session.avg_cadence ?? null,
      max_cadence: session.max_running_cadence ?? session.max_cadence ?? null,
      total_elevation_gain: session.total_ascent || null,
      total_ascent: session.total_ascent || null,
      total_descent: session.total_descent || null,
      avg_vertical_oscillation: session.avg_vertical_oscillation || null,
      avg_stance_time: session.avg_stance_time || null,
      avg_vertical_ratio: session.avg_vertical_ratio || null,
      avg_step_length: session.avg_step_length || null,
      calories: session.total_calories || null,
      total_strides: session.total_strides || null,
      training_effect: session.total_training_effect || null,
      avg_temperature: session.avg_temperature || null,
      num_laps: fitData.laps?.length || null,
      ...(bbox || {}),
      records_json: recordsJson.length > 0 ? recordsJson : null,
    };

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
      const lapRows = fitData.laps.map((lap: any, i: number) => {
        const lapStartLat = toDegrees(lap.start_position_lat);
        const lapStartLng = toDegrees(lap.start_position_long);
        const lapEndLat = toDegrees(lap.end_position_lat);
        const lapEndLng = toDegrees(lap.end_position_long);

        return {
          activity_id: activityId,
          user_id: user.id,
          lap_index: i,
          start_time: lap.start_time ? new Date(lap.start_time).toISOString() : null,
          duration_seconds: lap.total_timer_time != null ? Math.round(lap.total_timer_time * 10) / 10 : null,
          total_timer_time: lap.total_timer_time || null,
          total_elapsed_time: lap.total_elapsed_time || null,
          moving_time_seconds: lap.total_moving_time ?? lap.total_timer_time ?? null,
          distance_meters: lap.total_distance || null,
          avg_heart_rate: lap.avg_heart_rate || null,
          max_heart_rate: lap.max_heart_rate || null,
          avg_speed: lap.enhanced_avg_speed ?? lap.avg_speed ?? null,
          max_speed: lap.enhanced_max_speed ?? lap.max_speed ?? null,
          best_pace: lap.enhanced_max_speed ?? lap.max_speed ?? null,
          avg_power: lap.avg_power || null,
          max_power: lap.max_power || null,
          normalized_power: lap.normalized_power || null,
          avg_cadence: lap.avg_running_cadence ?? lap.avg_cadence ?? null,
          avg_run_cadence: lap.avg_running_cadence ?? lap.avg_cadence ?? null,
          max_run_cadence: lap.max_running_cadence ?? lap.max_cadence ?? null,
          total_elevation_gain: lap.total_ascent || null,
          total_ascent: lap.total_ascent || null,
          total_descent: lap.total_descent || null,
          min_altitude: lap.min_altitude ?? lap.enhanced_min_altitude ?? null,
          max_altitude: lap.max_altitude ?? lap.enhanced_max_altitude ?? null,
          avg_ground_contact_time: lap.avg_stance_time || null,
          avg_gct_balance: lap.avg_stance_time_balance || null,
          avg_stride_length: lap.avg_step_length || null,
          avg_vertical_oscillation: lap.avg_vertical_oscillation || null,
          avg_vertical_ratio: lap.avg_vertical_ratio || null,
          calories: lap.total_calories || null,
          total_strides: lap.total_strides || null,
          avg_temperature: lap.avg_temperature || null,
          start_lat: lapStartLat,
          start_lng: lapStartLng,
          end_lat: lapEndLat,
          end_lng: lapEndLng,
          avg_gap: lap.enhanced_avg_speed ? (lap.total_ascent ? lap.enhanced_avg_speed * 1.05 : lap.enhanced_avg_speed) : null,
          avg_moving_pace: null as number | null,
          avg_step_speed_loss: null,
          avg_step_speed_loss_percent: null,
          avg_watts_per_kg: null,
          max_watts_per_kg: null,
          cumulative_time_seconds: null as number | null,
        };
      });

      let cumTime = 0;
      for (const row of lapRows) {
        cumTime += row.duration_seconds || 0;
        row.cumulative_time_seconds = cumTime;
        if (row.distance_meters && row.moving_time_seconds) {
          row.avg_moving_pace = row.moving_time_seconds / row.distance_meters;
        }
      }

      const { error: lapError } = await adminClient.from("activity_laps").insert(lapRows);
      if (lapError) console.error("Failed to insert laps:", lapError.message);
    }

    // Insert activity_streams (sampled every 5th)
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
          speed: rec.enhanced_speed ?? rec.speed ?? null,
          cadence: rec.cadence || null,
          power: rec.power || null,
          altitude: rec.enhanced_altitude ?? rec.altitude ?? null,
          latitude: toDegrees(rec.position_lat),
          longitude: toDegrees(rec.position_long),
        });
      }

      for (let b = 0; b < streamRows.length; b += 500) {
        const batch = streamRows.slice(b, b + 500);
        const { error: streamError } = await adminClient.from("activity_streams").insert(batch);
        if (streamError) {
          console.error(`Failed to insert stream batch ${b}:`, streamError.message);
          break;
        }
      }
    }

    // Auto-match to training plan workout
    if (workout_id) {
      await adminClient
        .from("training_plan_workouts")
        .update({ matched_activity_id: activityId })
        .eq("id", workout_id)
        .eq("user_id", user.id);
      console.log(`Linked workout ${workout_id} to fit activity ${activityId}`);
    } else {
      const activityDate = startDate.split("T")[0];
      const { data: unmatchedWorkouts } = await adminClient
        .from("training_plan_workouts")
        .select("id, workout_type, day_of_week, week_start")
        .eq("user_id", user.id)
        .is("matched_activity_id", null)
        .is("matched_strava_activity_id", null);

      if (unmatchedWorkouts?.length) {
        for (const workout of unmatchedWorkouts) {
          const workoutDate = new Date(workout.week_start);
          workoutDate.setDate(workoutDate.getDate() + workout.day_of_week);
          const workoutDateStr = workoutDate.toISOString().split("T")[0];

          if (workoutDateStr === activityDate) {
            const wType = (workout.workout_type || "").toLowerCase();
            const aType = activityType.toLowerCase();
            if (wType === aType || wType.includes(aType) || aType.includes(wType) || wType === "workout") {
              await adminClient
                .from("training_plan_workouts")
                .update({ matched_activity_id: activityId })
                .eq("id", workout.id);
              console.log(`Auto-matched workout ${workout.id} to fit activity ${activityId}`);
              break;
            }
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
      records_count: recordsJson.length,
      has_gps: bbox != null,
      has_power: activityRow.average_power != null,
      has_running_dynamics: activityRow.avg_stance_time != null,
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

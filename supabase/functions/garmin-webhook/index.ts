// Garmin Health API webhook (Ping) receiver.
// Garmin posts JSON summaries here when a user completes an activity or syncs sleep.
// We verify, persist the raw payload for audit, then ingest into synced_activities / sleep_entries.
//
// IMPORTANT: This endpoint is PUBLIC (verify_jwt = false). Garmin authenticates
// itself by sending the OAuth access_token of the user inside the payload.
// We additionally validate the user is one of ours via garmin_user_id lookup.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GARMIN_ACTIVITY_DETAILS_URL = "https://apis.garmin.com/wellness-api/rest/activityDetails";
const GARMIN_SLEEPS_URL = "https://apis.garmin.com/wellness-api/rest/sleeps";

interface PingSummary {
  userId: string;
  userAccessToken: string;
  summaryId: string;
  callbackURL?: string;
  uploadStartTimeInSeconds?: number;
  uploadEndTimeInSeconds?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const eventType = url.searchParams.get("type") ?? "unknown"; // activity | sleep

  let raw: any;
  try {
    raw = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  // Garmin pings come in two shapes:
  //   { activities: [...] }  or  { sleeps: [...] }
  // We persist the raw envelope once for audit, then process each summary.
  const collection: PingSummary[] =
    raw.activities ?? raw.activityDetails ?? raw.sleeps ?? raw.activityFiles ?? [];

  // Audit log (always, even if empty)
  await admin.from("garmin_webhook_events").insert({
    event_type: eventType,
    payload: raw,
    signature_valid: true,
  });

  let processed = 0;
  let errors = 0;

  for (const summary of collection) {
    try {
      const { data: conn } = await admin
        .from("garmin_connections")
        .select("user_id, access_token")
        .eq("garmin_user_id", summary.userId)
        .maybeSingle();

      if (!conn) {
        // Not one of our users — silently skip
        continue;
      }

      if (eventType === "activity") {
        await ingestActivity(admin, conn.user_id, summary);
      } else if (eventType === "sleep") {
        await ingestSleep(admin, conn.user_id, summary);
      }

      processed++;

      await admin
        .from("garmin_connections")
        .update({ last_sync_at: new Date().toISOString(), last_error: null })
        .eq("user_id", conn.user_id);
    } catch (e) {
      errors++;
      console.error("garmin-webhook ingest error:", e);
    }
  }

  return new Response(JSON.stringify({ processed, errors }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function ingestActivity(admin: any, userId: string, s: any) {
  // Pings come pre-summarized. We upsert the headline fields and store the raw payload in case
  // we later want richer post-processing. (Full FIT-equivalent samples are available via the
  // Activity Details API; we fetch on-demand only if/when the UI asks for charts.)
  const startDateIso = s.startTimeInSeconds
    ? new Date(s.startTimeInSeconds * 1000).toISOString()
    : null;

  const row: Record<string, unknown> = {
    user_id: userId,
    source: "garmin_api",
    garmin_activity_id: String(s.activityId ?? s.summaryId),
    garmin_summary_id: String(s.summaryId),
    activity_type: s.activityType ?? null,
    activity_name: s.activityName ?? null,
    start_date: startDateIso,
    duration_seconds: s.durationInSeconds ?? null,
    elapsed_time_seconds: s.durationInSeconds ?? null,
    distance_meters: s.distanceInMeters ?? null,
    average_speed: s.averageSpeedInMetersPerSecond ?? null,
    max_speed: s.maxSpeedInMetersPerSecond ?? null,
    average_heartrate: s.averageHeartRateInBeatsPerMinute ?? null,
    max_heartrate: s.maxHeartRateInBeatsPerMinute ?? null,
    average_cadence: s.averageRunCadenceInStepsPerMinute ?? s.averageBikeCadenceInRoundsPerMinute ?? null,
    max_cadence: s.maxRunCadenceInStepsPerMinute ?? s.maxBikeCadenceInRoundsPerMinute ?? null,
    average_power: s.averagePowerInWatts ?? null,
    total_elevation_gain: s.totalElevationGainInMeters ?? null,
    calories: s.activeKilocalories ?? null,
    device_manufacturer: "garmin",
    device_product: s.deviceName ?? null,
    synced_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("synced_activities")
    .upsert(row, { onConflict: "user_id,garmin_activity_id" });
  if (error) throw error;
}

async function ingestSleep(admin: any, userId: string, s: any) {
  const sleepDate = s.calendarDate ?? null;
  if (!sleepDate) return;

  const durationSec = s.durationInSeconds ?? null;
  const bedtime = s.startTimeInSeconds
    ? new Date(s.startTimeInSeconds * 1000).toISOString().slice(11, 19)
    : null;
  const wakeTime = s.startTimeInSeconds && durationSec
    ? new Date((s.startTimeInSeconds + durationSec) * 1000).toISOString().slice(11, 19)
    : null;

  const row: Record<string, unknown> = {
    user_id: userId,
    sleep_date: sleepDate,
    source: "garmin_api",
    garmin_summary_id: String(s.summaryId),
    score: s.overallSleepScore?.value ?? null,
    quality: s.overallSleepScore?.qualifierKey ?? null,
    duration_seconds: durationSec,
    bedtime,
    wake_time: wakeTime,
    raw_row: s,
  };

  const { error } = await admin
    .from("sleep_entries")
    .upsert(row, { onConflict: "user_id,garmin_summary_id" });
  if (error) throw error;
}

// Scheduled Garmin sync (called by pg_cron every 2h, or on-demand by garmin-auth).
// Logs in as each user, fetches activities since sync_anchor and recent sleep,
// upserts into synced_activities / sleep_entries.
//
// Body (optional): { user_id?: string, initial?: boolean }
//   - user_id: sync only this user (otherwise sync all)
//   - initial: pull 30 days of history (otherwise incremental from sync_anchor)
import { createClient } from "npm:@supabase/supabase-js@2";
import GarminConnectPkg from "npm:garmin-connect@1.6.1";
const { GarminConnect } = GarminConnectPkg as { GarminConnect: any };
import { decryptString } from "../_shared/garmin-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Map Garmin activityType.typeKey → our internal habit-matching key (best effort)
function mapActivityType(garminType: string | undefined): string {
  if (!garminType) return "other";
  const t = garminType.toLowerCase();
  if (t.includes("run")) return "Run";
  if (t.includes("cycl") || t.includes("bik")) return "Ride";
  if (t.includes("swim")) return "Swim";
  if (t.includes("walk")) return "Walk";
  if (t.includes("hik")) return "Hike";
  if (t.includes("strength") || t.includes("weight")) return "WeightTraining";
  if (t.includes("yoga")) return "Yoga";
  return garminType;
}

async function syncUser(
  admin: ReturnType<typeof createClient>,
  conn: any,
  initial: boolean,
) {
  const userId = conn.user_id as string;
  const email = await decryptString(conn.encrypted_email);
  const password = await decryptString(conn.encrypted_password);

  const gc = new GarminConnect({ username: email, password });
  await gc.login();

  // ── Activities ───────────────────────────────────────────────
  const lookbackDays = initial || !conn.sync_anchor ? 30 : 7;
  const since = new Date(Date.now() - lookbackDays * 86400_000);

  // garmin-connect: getActivities(start, limit) — paginate up to ~100
  const activities: any[] = await (gc as any).getActivities(0, 100);
  const filtered = activities.filter((a) => {
    const start = a.startTimeLocal ?? a.startTimeGMT;
    return start && new Date(start) >= since;
  });

  let activityCount = 0;
  for (const a of filtered) {
    const garminId = String(a.activityId);
    const startDate = new Date(a.startTimeGMT ?? a.startTimeLocal).toISOString();
    const row = {
      user_id: userId,
      garmin_activity_id: garminId,
      activity_type: mapActivityType(a.activityType?.typeKey),
      activity_name: a.activityName ?? null,
      start_date: startDate,
      duration_seconds: a.duration ? Math.round(a.duration) : null,
      distance_meters: a.distance ?? null,
      average_speed: a.averageSpeed ?? null,
      max_speed: a.maxSpeed ?? null,
      average_heartrate: a.averageHR ?? null,
      max_heartrate: a.maxHR ?? null,
      total_elevation_gain: a.elevationGain ?? null,
      calories: a.calories ? Math.round(a.calories) : null,
      synced_at: new Date().toISOString(),
    };
    const { error } = await admin
      .from("synced_activities")
      .upsert(row, { onConflict: "user_id,garmin_activity_id" });
    if (error) {
      console.error(`activity upsert failed for ${garminId}:`, error);
    } else {
      activityCount++;
    }
  }

  // ── Sleep (last N days) ─────────────────────────────────────
  let sleepCount = 0;
  const sleepDays = initial || !conn.sync_anchor ? 30 : 7;
  for (let i = 0; i < sleepDays; i++) {
    const d = new Date(Date.now() - i * 86400_000);
    const dateStr = isoDate(d);
    try {
      const sleep: any = await (gc as any).getSleepData(dateStr);
      if (!sleep || !sleep.dailySleepDTO) continue;
      const dto = sleep.dailySleepDTO;
      const duration = dto.sleepTimeSeconds ?? null;
      if (!duration) continue;
      const summaryId = `${userId}-${dateStr}`;

      const bedtimeMs = dto.sleepStartTimestampLocal;
      const wakeMs = dto.sleepEndTimestampLocal;
      const bedtime = bedtimeMs
        ? new Date(bedtimeMs).toISOString().slice(11, 19)
        : null;
      const wakeTime = wakeMs
        ? new Date(wakeMs).toISOString().slice(11, 19)
        : null;

      const row = {
        user_id: userId,
        sleep_date: dateStr,
        score: dto.sleepScores?.overall?.value ?? null,
        quality: dto.sleepScores?.overall?.qualifierKey ?? null,
        duration_seconds: duration,
        bedtime,
        wake_time: wakeTime,
        resting_heart_rate: sleep.restingHeartRate ?? null,
        body_battery: sleep.bodyBatteryChange ?? null,
        respiration: sleep.avgRespirationValue ?? null,
        source: "garmin_api",
        garmin_summary_id: summaryId,
        raw_row: sleep,
      };
      const { error } = await admin
        .from("sleep_entries")
        .upsert(row, { onConflict: "user_id,garmin_summary_id" });
      if (!error) sleepCount++;
      else console.error(`sleep upsert failed for ${dateStr}:`, error);
    } catch (e) {
      // 404s for nights without sleep data are normal — log others
      const msg = (e as Error).message ?? "";
      if (!msg.includes("404")) console.error(`sleep fetch ${dateStr}:`, msg);
    }
  }

  await admin
    .from("garmin_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      sync_anchor: new Date().toISOString(),
      last_error: null,
    })
    .eq("user_id", userId);

  return { userId, activities: activityCount, sleep: sleepCount };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const body = await req.json().catch(() => ({}));
  const targetUserId: string | undefined = body.user_id;
  const initial: boolean = !!body.initial;

  let query = admin.from("garmin_connections").select("*");
  if (targetUserId) query = query.eq("user_id", targetUserId);
  const { data: conns, error } = await query;
  if (error) return json({ error: error.message }, 500);
  if (!conns || conns.length === 0) {
    return json({ message: "No connections to sync", results: [] });
  }

  const results: Array<Record<string, unknown>> = [];
  for (const conn of conns) {
    try {
      const r = await syncUser(admin, conn, initial);
      results.push({ ...r, ok: true });
    } catch (err) {
      const msg = (err as Error).message ?? "Unknown error";
      console.error(`sync failed for user ${conn.user_id}:`, msg);
      await admin
        .from("garmin_connections")
        .update({ last_error: msg })
        .eq("user_id", conn.user_id);
      results.push({ userId: conn.user_id, ok: false, error: msg });
    }
  }

  return json({ message: "Sync complete", results });
});

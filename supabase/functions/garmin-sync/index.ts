// Scheduled Garmin sync — runs every 6h via pg_cron (job: garmin-sync-every-6h)
// Pulls per user, paced + rate-limit aware:
//   • Activities (summary)          → synced_activities
//   • .fit file for each new activity → fit-files bucket + parse-fit-file (laps/streams)
//   • Sleep (per night)             → sleep_entries
//   • Weight / body composition     → body_measurements + garmin_body_composition (raw)
//   • Daily wellness (steps, cals, HR, HRV, stress, body battery, SpO2, respiration)
//                                   → garmin_wellness_daily
//
// Body (optional): { user_id?: string, initial?: boolean }
//   - user_id: sync only this user
//   - initial: force 30-day historical backfill regardless of backfill_completed flag

import { createClient } from "npm:@supabase/supabase-js@2";
import GarminConnectPkg from "npm:garmin-connect@1.6.1";
const { GarminConnect } = GarminConnectPkg as { GarminConnect: any };
import { decryptString } from "../_shared/garmin-crypto.ts";
import { is429, paceDelay as sleep, withBackoff } from "../_shared/garmin-backoff.ts";
import { SyncRunLogger } from "../_shared/sync-logger.ts";

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

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function mapActivityType(t: string | undefined): string {
  if (!t) return "other";
  const x = t.toLowerCase();
  if (x.includes("run")) return "Run";
  if (x.includes("cycl") || x.includes("bik")) return "Ride";
  if (x.includes("swim")) return "Swim";
  if (x.includes("walk")) return "Walk";
  if (x.includes("hik")) return "Hike";
  if (x.includes("strength") || x.includes("weight")) return "WeightTraining";
  if (x.includes("yoga")) return "Yoga";
  return t;
}

/** Pull .fit (zip) from Garmin and pipe through parse-fit-file. */
async function ingestFitFile(
  admin: ReturnType<typeof createClient>,
  gc: any,
  userId: string,
  garminActivityId: string,
  syncedActivityId: string,
  supabaseUrl: string,
  serviceKey: string,
  logger?: SyncRunLogger,
) {
  // Use library helper if present, else direct download via Garmin's download-service endpoint
  let buffer: ArrayBuffer | null = null;
  try {
    buffer = await withBackoff(async () => {
      let buf: any = null;
      if (typeof gc.downloadOriginalActivityData === "function") {
        buf = await gc.downloadOriginalActivityData({ activityId: garminActivityId });
      }
      if (!buf && gc.client?.get) {
        const url = `https://connect.garmin.com/download-service/files/activity/${garminActivityId}`;
        const resp = await gc.client.get(url, { responseType: "arraybuffer" });
        buf = resp?.data ?? resp;
      }
      if (buf instanceof ArrayBuffer) return buf;
      if (buf?.buffer) return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      return null;
    }, { label: `fit ${garminActivityId}`, retries: 2, baseMs: 6000, maxMs: 30000 });
  } catch (e) {
    if (is429(e)) throw e;
    const msg = (e as Error).message;
    console.warn(`fit download failed for ${garminActivityId}:`, msg);
    logger?.addItem({ kind: "fit_file", ref: garminActivityId, ok: false, status: "failed", message: `Garmin download failed: ${msg}` });
    return false;
  }
  if (!buffer || buffer.byteLength < 100) {
    logger?.addItem({ kind: "fit_file", ref: garminActivityId, ok: false, status: "failed", message: "Empty .fit payload from Garmin" });
    return false;
  }

  const fileName = `garmin_${garminActivityId}.zip`;
  const path = `${userId}/garmin/${Date.now()}_${fileName}`;
  const { error: upErr } = await admin.storage.from("fit-files").upload(path, new Blob([buffer]), {
    contentType: "application/zip",
    upsert: false,
  });
  if (upErr) {
    console.warn(`fit upload failed for ${garminActivityId}:`, upErr.message);
    logger?.addItem({ kind: "fit_file", ref: garminActivityId, ok: false, status: "failed", message: `Storage upload failed: ${upErr.message}` });
    return false;
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/parse-fit-file`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({
      file_path: path,
      overwrite_activity_id: syncedActivityId,
      user_id: userId,
      timezone: "UTC",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(`parse-fit-file failed for ${garminActivityId}:`, text.slice(0, 200));
    logger?.addItem({ kind: "fit_file", ref: garminActivityId, ok: false, status: "failed", message: `parse-fit-file failed: ${text.slice(0, 200) || res.statusText}` });
    return false;
  }
  logger?.addItem({ kind: "fit_file", ref: garminActivityId, ok: true, status: "created", message: ".fit downloaded + parsed", summary: { bytes: buffer.byteLength, path } });
  return true;
}

async function syncUser(
  admin: ReturnType<typeof createClient>,
  conn: any,
  initial: boolean,
  supabaseUrl: string,
  serviceKey: string,
) {
  const userId = conn.user_id as string;
  const email = await decryptString(conn.encrypted_email);
  const password = await decryptString(conn.encrypted_password);

  const gc = new GarminConnect({ username: email, password });
  // Login is the call most commonly throttled — be patient with retries.
  await withBackoff(() => gc.login(), {
    label: `login ${userId}`,
    retries: 3,
    baseMs: 20000,
    maxMs: 90000,
  });
  await sleep(1500);

  const doBackfill = initial || !conn.backfill_completed;
  const lookbackDays = doBackfill ? 30 : 14;
  const since = new Date(Date.now() - lookbackDays * 86400_000);
  const sinceMs = since.getTime();

  const result = {
    userId,
    activities: 0,
    fit_files: 0,
    sleep: 0,
    wellness: 0,
    weight: 0,
    errors: [] as string[],
    rate_limited: false,
  };

  // ── Activities + .fit per activity ─────────────────────────
  let activities: any[] = [];
  try {
    activities = (await withBackoff(
      () => gc.getActivities(0, doBackfill ? 100 : 30),
      { label: "getActivities", retries: 2, baseMs: 6000, maxMs: 30000 },
    )) ?? [];
  } catch (e) {
    if (is429(e)) result.rate_limited = true;
    result.errors.push(`activities: ${(e as Error).message}`);
  }

  const newAct = activities.filter((a) => {
    const start = a.startTimeGMT ?? a.startTimeLocal;
    return start && new Date(start).getTime() >= sinceMs;
  });

  for (const a of newAct) {
    if (result.rate_limited) break;
    const garminId = String(a.activityId);
    const startIso = new Date(a.startTimeGMT ?? a.startTimeLocal).toISOString();
    const row = {
      user_id: userId,
      garmin_activity_id: garminId,
      activity_type: mapActivityType(a.activityType?.typeKey),
      activity_name: a.activityName ?? null,
      start_date: startIso,
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
    const { data: upserted, error } = await admin
      .from("synced_activities")
      .upsert(row, { onConflict: "user_id,garmin_activity_id" })
      .select("id, fit_file_path")
      .maybeSingle();
    if (error) {
      result.errors.push(`act ${garminId}: ${error.message}`);
      continue;
    }
    result.activities++;

    // Pull .fit only if not already enriched (avoid clobbering manual uploads)
    if (upserted?.id && !upserted.fit_file_path) {
      try {
        const ok = await ingestFitFile(admin, gc, userId, garminId, upserted.id, supabaseUrl, serviceKey);
        if (ok) result.fit_files++;
        await sleep(1500);
      } catch (e) {
        if (is429(e)) {
          result.rate_limited = true;
          result.errors.push(`fit ${garminId}: rate limited — will retry next run`);
          break;
        }
        result.errors.push(`fit ${garminId}: ${(e as Error).message}`);
      }
    }
  }

  // ── Sleep (per night) ───────────────────────────────────────
  const sleepDays = doBackfill ? 30 : 10;
  for (let i = 0; i < sleepDays && !result.rate_limited; i++) {
    const dateStr = isoDate(new Date(Date.now() - i * 86400_000));
    try {
      const s: any = await withBackoff(
        () => gc.getSleepData?.(dateStr),
        { label: `sleep ${dateStr}`, retries: 2, baseMs: 5000, maxMs: 20000 },
      );
      if (!s?.dailySleepDTO?.sleepTimeSeconds) {
        await sleep(600);
        continue;
      }
      const dto = s.dailySleepDTO;
      const row = {
        user_id: userId,
        sleep_date: dateStr,
        score: dto.sleepScores?.overall?.value ?? null,
        quality: dto.sleepScores?.overall?.qualifierKey ?? null,
        duration_seconds: dto.sleepTimeSeconds,
        bedtime: dto.sleepStartTimestampLocal
          ? new Date(dto.sleepStartTimestampLocal).toISOString().slice(11, 19)
          : null,
        wake_time: dto.sleepEndTimestampLocal
          ? new Date(dto.sleepEndTimestampLocal).toISOString().slice(11, 19)
          : null,
        resting_heart_rate: s.restingHeartRate ?? null,
        body_battery: s.bodyBatteryChange ?? null,
        respiration: s.avgRespirationValue ?? null,
        source: "garmin_api",
        garmin_summary_id: `${userId}-${dateStr}`,
        raw_row: s,
      };
      const { error } = await admin
        .from("sleep_entries")
        .upsert(row, { onConflict: "user_id,garmin_summary_id" });
      if (!error) result.sleep++;
      await sleep(700);
    } catch (e) {
      if (is429(e)) { result.rate_limited = true; break; }
      const m = (e as Error).message ?? "";
      if (!m.includes("404")) result.errors.push(`sleep ${dateStr}: ${m}`);
    }
  }

  // ── Daily wellness (steps, calories, HR, HRV, stress, body battery) ─
  const wellnessDays = doBackfill ? 30 : 10;
  for (let i = 0; i < wellnessDays && !result.rate_limited; i++) {
    const dateStr = isoDate(new Date(Date.now() - i * 86400_000));
    try {
      const safeCall = async (fn: (() => Promise<any>) | undefined, label: string) => {
        if (typeof fn !== "function") return null;
        try {
          return await withBackoff(fn, { label, retries: 1, baseMs: 4000, maxMs: 12000 });
        } catch (e) {
          if (is429(e)) throw e;
          return null;
        }
      };
      const stats: any = (await safeCall(() => gc.getDailyStats?.(dateStr), `stats ${dateStr}`))
        ?? (await safeCall(() => gc.getUserSummary?.(dateStr), `summary ${dateStr}`));
      const hr: any = await safeCall(() => gc.getHeartRate?.(dateStr), `hr ${dateStr}`);
      const stress: any = await safeCall(() => gc.getStress?.(dateStr), `stress ${dateStr}`);
      const hrv: any = await safeCall(() => gc.getHrv?.(dateStr), `hrv ${dateStr}`);

      const row: Record<string, any> = {
        user_id: userId,
        wellness_date: dateStr,
        steps: stats?.totalSteps ?? stats?.steps ?? null,
        active_calories: stats?.activeKilocalories ?? stats?.activeCalories ?? null,
        total_calories: stats?.totalKilocalories ?? stats?.totalCalories ?? null,
        floors_climbed: stats?.floorsAscended ?? null,
        resting_heart_rate: hr?.restingHeartRate ?? stats?.restingHeartRate ?? null,
        min_heart_rate: hr?.minHeartRate ?? stats?.minHeartRate ?? null,
        max_heart_rate: hr?.maxHeartRate ?? stats?.maxHeartRate ?? null,
        hrv_weekly_avg: hrv?.hrvSummary?.weeklyAvg ?? null,
        hrv_last_night_avg: hrv?.hrvSummary?.lastNightAvg ?? null,
        hrv_status: hrv?.hrvSummary?.status ?? null,
        stress_avg: stress?.avgStressLevel ?? stats?.averageStressLevel ?? null,
        stress_max: stress?.maxStressLevel ?? stats?.maxStressLevel ?? null,
        body_battery_min: stats?.bodyBatteryLowestValue ?? null,
        body_battery_max: stats?.bodyBatteryHighestValue ?? null,
        body_battery_charged: stats?.bodyBatteryChargedValue ?? null,
        body_battery_drained: stats?.bodyBatteryDrainedValue ?? null,
        respiration_avg: stats?.avgWakingRespirationValue ?? null,
        spo2_avg: stats?.averageSpo2 ?? null,
        raw_row: { stats, hr, stress, hrv },
        synced_at: new Date().toISOString(),
      };

      // Skip days with no actual data
      const hasData = Object.entries(row).some(
        ([k, v]) => v != null && !["user_id", "wellness_date", "source", "synced_at", "raw_row"].includes(k),
      );
      if (!hasData) { await sleep(500); continue; }

      const { error } = await admin
        .from("garmin_wellness_daily")
        .upsert(row, { onConflict: "user_id,wellness_date" });
      if (!error) result.wellness++;
      else result.errors.push(`wellness ${dateStr}: ${error.message}`);
      await sleep(900);
    } catch (e) {
      if (is429(e)) { result.rate_limited = true; break; }
      result.errors.push(`wellness ${dateStr}: ${(e as Error).message}`);
    }
  }

  // ── Weight / body composition ───────────────────────────────
  if (!result.rate_limited) {
    try {
      const endDate = isoDate(new Date());
      const startDate = isoDate(new Date(Date.now() - (doBackfill ? 90 : 14) * 86400_000));
      // Library variants
      let weighIns: any[] = [];
      try {
        const res: any = await withBackoff(
          async () =>
            (await gc.getDailyWeightInRange?.(startDate, endDate)) ??
            (await gc.getWeighIns?.(startDate, endDate)),
          { label: "weight-range", retries: 2, baseMs: 5000, maxMs: 20000 },
        );
        weighIns = Array.isArray(res) ? res : (res?.dailyWeightSummaries ?? res?.weightList ?? []);
      } catch (e) {
        if (is429(e)) result.rate_limited = true;
        else result.errors.push(`weight range: ${(e as Error).message}`);
      }

      for (const w of weighIns) {
        const ts = w.date ?? w.timestampGMT ?? w.samplePk;
        if (!ts) continue;
        const dateStr = typeof ts === "string" ? ts.slice(0, 10) : isoDate(new Date(ts));
        const weightKg = w.weight ? Number(w.weight) / 1000 : (w.weightKg ?? null);
        const bf = w.bodyFat ?? w.bodyFatPercentage ?? null;
        const water = w.bodyWater ?? null;
        const bone = w.boneMass ? Number(w.boneMass) / 1000 : null;
        const muscle = w.muscleMass ? Number(w.muscleMass) / 1000 : null;
        const bmi = w.bmi ?? null;
        const visceral = w.visceralFat ?? null;
        const metAge = w.metabolicAge ?? null;

        // Raw mirror
        const { error: rawErr } = await admin
          .from("garmin_body_composition")
          .upsert({
            user_id: userId,
            measured_on: dateStr,
            measured_at: ts && typeof ts === "number" ? new Date(ts).toISOString() : null,
            weight_kg: weightKg,
            body_fat_pct: bf,
            body_water_pct: water,
            bone_mass_kg: bone,
            muscle_mass_kg: muscle,
            bmi,
            visceral_fat: visceral,
            metabolic_age: metAge,
            source_device: w.sourceType ?? null,
            raw_row: w,
            synced_at: new Date().toISOString(),
          }, { onConflict: "user_id,measured_on" });
        if (rawErr) { result.errors.push(`body raw ${dateStr}: ${rawErr.message}`); continue; }

        // Unified body_measurements (source = 'garmin')
        const { error: bmErr } = await admin
          .from("body_measurements")
          .upsert({
            user_id: userId,
            measured_on: dateStr,
            weight_kg: weightKg,
            body_fat_pct: bf,
            lean_mass_kg: muscle,
            source: "garmin",
          }, { onConflict: "user_id,measured_on,source" });
        if (bmErr) result.errors.push(`body_meas ${dateStr}: ${bmErr.message}`);
        else result.weight++;
      }
    } catch (e) {
      if (is429(e)) result.rate_limited = true;
      else result.errors.push(`weight: ${(e as Error).message}`);
    }
  }

  // ── Update connection state ─────────────────────────────────
  await admin
    .from("garmin_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      sync_anchor: new Date().toISOString(),
      last_activity_anchor: newAct[0]?.startTimeGMT
        ? new Date(newAct[0].startTimeGMT).toISOString()
        : conn.last_activity_anchor,
      backfill_completed: result.rate_limited ? conn.backfill_completed : true,
      last_error: result.rate_limited
        ? "Garmin rate-limited mid-sync — will resume next run."
        : (result.errors.length ? result.errors.slice(0, 3).join(" | ") : null),
    })
    .eq("user_id", userId);

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const body = await req.json().catch(() => ({}));
  const targetUserId: string | undefined = body.user_id;
  const initial: boolean = !!body.initial;

  let q = admin.from("garmin_connections").select("*");
  if (targetUserId) q = q.eq("user_id", targetUserId);
  const { data: conns, error } = await q;
  if (error) return json({ error: error.message }, 500);
  if (!conns?.length) return json({ message: "No connections to sync", results: [] });

  const results: Array<Record<string, unknown>> = [];
  for (const conn of conns) {
    try {
      const r = await syncUser(admin, conn, initial, supabaseUrl, serviceKey);
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

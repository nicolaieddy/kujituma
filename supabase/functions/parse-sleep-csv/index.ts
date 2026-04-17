import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Strip BOM, normalize line endings, split into rows. */
function parseCsv(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r/g, "");
  return cleaned
    .split("\n")
    .map(line => line.split(",").map(c => c.trim()));
}

function nullable(v: string | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  if (!t || t === "--") return null;
  return t;
}

function toInt(v: string | undefined): number | null {
  const s = nullable(v);
  if (s == null) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function toNum(v: string | undefined): number | null {
  const s = nullable(v);
  if (s == null) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** "7h 21min" or "7h 21m" → seconds. */
function parseDurationToSeconds(v: string | undefined | null): number | null {
  const s = nullable(v ?? undefined);
  if (!s) return null;
  const hMatch = s.match(/(\d+)\s*h/i);
  const mMatch = s.match(/(\d+)\s*m/i);
  if (!hMatch && !mMatch) return null;
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
  const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
  return hours * 3600 + mins * 60;
}

/** "1:22 AM" or "8:52 AM" → "01:22:00" (Postgres `time`). */
function parseTime12h(v: string | undefined | null): string | null {
  const s = nullable(v ?? undefined);
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const meridian = m[3]?.toUpperCase();
  if (meridian === "PM" && hour < 12) hour += 12;
  if (meridian === "AM" && hour === 12) hour = 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

/** Strip a unit suffix like "41 bpm", "97%", "97 ms" → "41". */
function stripUnit(v: string | null): string | null {
  if (!v) return null;
  const m = v.match(/^([+-]?\d+(?:\.\d+)?)/);
  return m ? m[1] : v;
}

/** ============================================================
 *  Format A: Multi-day table (Garmin "Sleep Score 7 Days" export)
 *  Header row, then one row per night.
 *  ============================================================ */
function tryParseMultiDay(rows: string[][], userId: string): any[] | null {
  if (rows.length < 2) return null;
  const header = rows[0].map(h => h.toLowerCase());
  const idx = (name: string) => header.findIndex(h => h === name.toLowerCase());

  const scoreIdx = idx("score");
  const qualityIdx = idx("quality");
  const durationIdx = idx("duration");
  if (scoreIdx === -1 || qualityIdx === -1 || durationIdx === -1) return null;

  const dateIdx = 0;
  const rhrIdx = idx("resting heart rate");
  const bbIdx = idx("body battery");
  const pulseOxIdx = idx("pulse ox");
  const respIdx = idx("respiration");
  const skinTempIdx = idx("skin temp change");
  const hrvIdx = idx("hrv status");
  const needIdx = idx("sleep need");
  const bedtimeIdx = idx("bedtime");
  const wakeIdx = idx("wake time");
  const alignIdx = idx("sleep alignment");

  const upserts: any[] = [];
  for (const row of rows.slice(1)) {
    const sleepDate = nullable(row[dateIdx]);
    if (!sleepDate || !/^\d{4}-\d{2}-\d{2}$/.test(sleepDate)) continue;
    const score = toInt(row[scoreIdx]);
    const quality = nullable(row[qualityIdx]);
    const duration = parseDurationToSeconds(row[durationIdx]);
    if (score == null && quality == null && duration == null) continue;

    const rawRow: Record<string, string | null> = {};
    rows[0].forEach((col, i) => { rawRow[col] = nullable(row[i]); });

    upserts.push({
      user_id: userId,
      sleep_date: sleepDate,
      score,
      quality,
      duration_seconds: duration,
      sleep_need_seconds: parseDurationToSeconds(row[needIdx]),
      bedtime: parseTime12h(row[bedtimeIdx]),
      wake_time: parseTime12h(row[wakeIdx]),
      resting_heart_rate: toInt(row[rhrIdx]),
      body_battery: toInt(row[bbIdx]),
      pulse_ox: toNum(row[pulseOxIdx]),
      respiration: toNum(row[respIdx]),
      skin_temp_change: toNum(row[skinTempIdx]),
      hrv_status: nullable(row[hrvIdx]),
      sleep_alignment: nullable(row[alignIdx]),
      source: "garmin_csv",
      raw_row: rawRow,
    });
  }
  return upserts;
}

/** ============================================================
 *  Format B: Single-night vertical export ("Sleep Score 1 Day")
 *  Vertical key/value rows organized in sections.
 *  ============================================================ */
function tryParseSingleNight(rows: string[][], userId: string): any[] | null {
  // Build a flat key→value map from all rows that look like "key,value"
  const kv: Record<string, string> = {};
  let isSingleNight = false;
  for (const row of rows) {
    if (row.length === 0) continue;
    const key = (row[0] ?? "").trim();
    const val = (row[1] ?? "").trim();
    if (!key) continue;
    if (key.toLowerCase().startsWith("sleep score 1 day")) isSingleNight = true;
    if (val) kv[key.toLowerCase()] = val;
  }
  if (!isSingleNight) return null;

  const sleepDate = nullable(kv["date"]);
  if (!sleepDate || !/^\d{4}-\d{2}-\d{2}$/.test(sleepDate)) return null;

  const rawRow: Record<string, string> = {};
  for (const [k, v] of Object.entries(kv)) rawRow[k] = v;

  return [{
    user_id: userId,
    sleep_date: sleepDate,
    score: toInt(kv["sleep score"]),
    quality: nullable(kv["quality"]),
    duration_seconds: parseDurationToSeconds(kv["sleep duration"]),
    sleep_need_seconds: null,
    bedtime: null,
    wake_time: null,
    resting_heart_rate: toInt(stripUnit(nullable(kv["resting heart rate"]))),
    body_battery: toInt(stripUnit(nullable(kv["body battery change"]))),
    pulse_ox: toNum(stripUnit(nullable(kv["avg spo₂"] ?? kv["avg spo2"]))),
    respiration: toNum(stripUnit(nullable(kv["avg respiration"]))),
    skin_temp_change: null, // "Calibrating" is non-numeric
    hrv_status: nullable(kv["7d avg hrv"]),
    sleep_alignment: nullable(kv["sleep alignment"]),
    source: "garmin_csv_single",
    raw_row: rawRow,
  }];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

    const { file_path } = await req.json();
    console.log("parse-sleep-csv: file_path =", file_path);
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
      console.error("parse-sleep-csv: download failed", downloadError);
      return new Response(JSON.stringify({ error: `Failed to download file: ${downloadError?.message}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = await fileData.text();
    const rows = parseCsv(text);
    console.log("parse-sleep-csv: rows =", rows.length, "first row =", rows[0]);
    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: "CSV is empty" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try multi-day table format, then fall back to single-night vertical format.
    let upserts = tryParseMultiDay(rows, user.id);
    let formatUsed = "multi_day";
    if (!upserts || upserts.length === 0) {
      const singleNight = tryParseSingleNight(rows, user.id);
      if (singleNight && singleNight.length > 0) {
        upserts = singleNight;
        formatUsed = "single_night";
      }
    }

    if (!upserts || upserts.length === 0) {
      return new Response(JSON.stringify({
        error: "Unrecognized CSV format — supported: Garmin multi-day table OR single-night vertical export",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const datesImported = upserts.map(u => u.sleep_date).sort();
    console.log(`parse-sleep-csv: format=${formatUsed} importing ${upserts.length} entries`);

    const { error: upsertError } = await adminClient
      .from("sleep_entries")
      .upsert(upserts, { onConflict: "user_id,sleep_date" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(JSON.stringify({ error: `Upsert failed: ${upsertError.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      summary: {
        kind: "sleep",
        format: formatUsed,
        entries_imported: upserts.length,
        dates: datesImported,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("parse-sleep-csv error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

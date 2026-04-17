import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Strip BOM, split into rows, parse simple CSV (no embedded commas in values). */
function parseCsv(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r/g, "");
  return cleaned
    .split("\n")
    .filter(line => line.trim().length > 0)
    .map(line => line.split(",").map(c => c.trim()));
}

/** "--" or empty becomes null; otherwise return the trimmed string. */
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
function parseDurationToSeconds(v: string | undefined): number | null {
  const s = nullable(v);
  if (!s) return null;
  const hMatch = s.match(/(\d+)\s*h/i);
  const mMatch = s.match(/(\d+)\s*m/i);
  if (!hMatch && !mMatch) return null;
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
  const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
  return hours * 3600 + mins * 60;
}

/** "1:22 AM" or "8:52 AM" → "01:22:00" (Postgres `time`). */
function parseTime12h(v: string | undefined): string | null {
  const s = nullable(v);
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

    const text = await fileData.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: "CSV is empty or has no data rows" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Header validation: expect Garmin columns. First col is date (mislabeled "Sleep Score 7 Days").
    const header = rows[0].map(h => h.toLowerCase());
    const idx = (name: string) => header.findIndex(h => h === name.toLowerCase());

    const dateIdx = 0; // first column is always the date
    const scoreIdx = idx("score");
    const rhrIdx = idx("resting heart rate");
    const bbIdx = idx("body battery");
    const pulseOxIdx = idx("pulse ox");
    const respIdx = idx("respiration");
    const skinTempIdx = idx("skin temp change");
    const hrvIdx = idx("hrv status");
    const qualityIdx = idx("quality");
    const durationIdx = idx("duration");
    const needIdx = idx("sleep need");
    const bedtimeIdx = idx("bedtime");
    const wakeIdx = idx("wake time");
    const alignIdx = idx("sleep alignment");

    if (scoreIdx === -1 || qualityIdx === -1 || durationIdx === -1) {
      return new Response(JSON.stringify({
        error: "Unrecognized CSV format — expected Garmin sleep export with Score/Quality/Duration columns",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataRows = rows.slice(1);
    const upserts: any[] = [];
    const datesImported: string[] = [];

    for (const row of dataRows) {
      const sleepDate = nullable(row[dateIdx]);
      if (!sleepDate || !/^\d{4}-\d{2}-\d{2}$/.test(sleepDate)) continue;

      const score = toInt(row[scoreIdx]);
      const quality = nullable(row[qualityIdx]);
      const duration = parseDurationToSeconds(row[durationIdx]);

      // Skip nights with no real data (Score, Quality, and Duration all null = no reading)
      if (score == null && quality == null && duration == null) continue;

      const rawRow: Record<string, string | null> = {};
      rows[0].forEach((col, i) => { rawRow[col] = nullable(row[i]); });

      upserts.push({
        user_id: user.id,
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
      datesImported.push(sleepDate);
    }

    if (upserts.length === 0) {
      return new Response(JSON.stringify({
        summary: { entries_imported: 0, dates: [], note: "No nights with valid data found in CSV" },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        entries_imported: upserts.length,
        dates: datesImported.sort(),
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

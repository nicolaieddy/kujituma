// Analyzes uploaded files (already in storage at temp paths) and proposes
// either attaching to an existing training_event or creating a new one.
// Files stay at their temp path; the client moves them after the user confirms.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import FitParser from "npm:fit-file-parser@2.1.0";
import JSZip from "https://esm.sh/jszip@3.10.1";
import tzlookup from "npm:tz-lookup@6.1.25";

function parseFitBuffer(buffer: ArrayBuffer): Promise<any> {
  return new Promise((resolve, reject) => {
    const parser = new FitParser({ force: true, speedUnit: "m/s", lengthUnit: "m", elapsedRecordField: true });
    parser.parse(buffer, (err: any, data: any) => err ? reject(err) : resolve(data));
  });
}
async function extractFitBuffer(buffer: ArrayBuffer, fileName: string): Promise<ArrayBuffer> {
  if (fileName.toLowerCase().endsWith(".zip")) {
    const zip = new JSZip();
    const contents = await zip.loadAsync(buffer);
    const fit = Object.keys(contents.files).find(n => n.toLowerCase().endsWith(".fit"));
    if (!fit) throw new Error("No .fit inside zip");
    return await contents.files[fit].async("arraybuffer");
  }
  return buffer;
}
const toDeg = (sc: number | null | undefined): number | null =>
  sc != null ? sc * (180 / 2147483648) : null;
function inferSport(sport?: string): string {
  const s = (sport || "").toLowerCase();
  if (s.includes("run")) return "Run";
  if (s.includes("cycling") || s.includes("biking") || s.includes("ride")) return "Ride";
  if (s.includes("swim")) return "Swim";
  if (s.includes("hik")) return "Hike";
  if (s.includes("walk")) return "Walk";
  return sport || "Workout";
}
function localDate(utcIso: string, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(utcIso));
  return `${parts.find(p=>p.type==="year")!.value}-${parts.find(p=>p.type==="month")!.value}-${parts.find(p=>p.type==="day")!.value}`;
}
function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = Math.round(sec % 60);
  return h ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}
function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60); const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPPORTED_IMAGE = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const SUPPORTED_DOC = ["application/pdf"];
const MAX_FILE_BYTES = 15 * 1024 * 1024;

interface InputFile {
  file_path: string;       // temp storage path inside fit-files bucket
  file_name: string;
  mime_type?: string;
  size_bytes?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const files: InputFile[] = Array.isArray(body?.files) ? body.files : [];
    if (!files.length) return json({ error: "files[] required" }, 400);
    if (files.length > 20) return json({ error: "max 20 files per batch" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    // Load existing events from the last 18 months for matching
    const eighteenMo = new Date();
    eighteenMo.setMonth(eighteenMo.getMonth() - 18);
    const { data: existingEvents } = await supabase
      .from("training_events")
      .select("id, event_type, title, start_date, end_date, body_part, race_distance, location")
      .eq("user_id", userId)
      .gte("start_date", eighteenMo.toISOString().slice(0, 10))
      .order("start_date", { ascending: false });

    // Extract each file in parallel (bounded)
    const extracted = await Promise.all(
      files.map((f) => extractOne(supabase, f, LOVABLE_API_KEY)),
    );

    // Group files: same event_type AND start_date within 2 days
    type Group = {
      id: string;
      files: typeof extracted;
      proposed_event: any;
    };
    const groups: Group[] = [];
    for (const ex of extracted) {
      if (!ex.extraction) {
        // ungrouped failure
        groups.push({
          id: crypto.randomUUID(),
          files: [ex],
          proposed_event: {
            event_type: "other",
            title: ex.file_name,
            start_date: todayISO(),
            description: ex.error ? `(extraction failed: ${ex.error})` : "",
          },
        });
        continue;
      }
      const x = ex.extraction;
      const existingGroup = groups.find((g) => {
        if (!g.proposed_event) return false;
        if (g.proposed_event.event_type !== x.event_type) return false;
        return daysApart(g.proposed_event.start_date, x.start_date) <= 2;
      });
      if (existingGroup) {
        existingGroup.files.push(ex);
        existingGroup.proposed_event = mergeProposed(existingGroup.proposed_event, x);
      } else {
        groups.push({
          id: crypto.randomUUID(),
          files: [ex],
          proposed_event: { ...x },
        });
      }
    }

    // Match each group against existing events
    const proposals = groups.map((g) => {
      const candidates = (existingEvents ?? [])
        .map((ev) => ({ ev, score: matchScore(g.proposed_event, ev) }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      const best = candidates[0];
      const match = best && best.score >= 5
        ? {
            event_id: best.ev.id,
            title: best.ev.title,
            start_date: best.ev.start_date,
            event_type: best.ev.event_type,
            confidence: best.score >= 9 ? "high" : best.score >= 7 ? "medium" : "low",
          }
        : null;

      return {
        id: g.id,
        decision: match ? "attach" : "new", // default suggestion
        files: g.files.map((f) => ({
          file_path: f.file_path,
          file_name: f.file_name,
          mime_type: f.mime_type,
          size_bytes: f.size_bytes,
          kind: f.kind,
          description_md: f.description_md ?? "",
          summary: f.extraction?.summary ?? "",
          error: f.error ?? null,
        })),
        proposed_event: g.proposed_event,
        match,
        candidates: candidates.map((c) => ({
          event_id: c.ev.id,
          title: c.ev.title,
          start_date: c.ev.start_date,
          event_type: c.ev.event_type,
          score: c.score,
        })),
      };
    });

    return json({ proposals });
  } catch (e) {
    console.error("analyze-event-uploads fatal", e);
    return json({ error: (e as Error).message }, 500);
  }
});

// --- helpers ---

async function extractOne(supabase: any, f: InputFile, apiKey: string) {
  const result: any = { ...f, extraction: null, description_md: "", error: null, kind: "other" };
  try {
    const name = f.file_name.toLowerCase();
    if (name.endsWith(".fit") || name.endsWith(".zip")) {
      result.kind = "fit";
      try {
        const { data: blob, error: dlErr } = await supabase.storage.from("fit-files").download(f.file_path);
        if (dlErr || !blob) throw new Error(dlErr?.message || "download failed");
        const raw = await blob.arrayBuffer();
        const buf = await extractFitBuffer(raw, f.file_name);
        const fit = await parseFitBuffer(buf);
        const session = fit.sessions?.[0];
        if (!session) throw new Error("No session in .fit");

        const sport = inferSport(session.sport);
        const startIso = session.start_time ? new Date(session.start_time).toISOString() : new Date().toISOString();
        const duration = session.total_timer_time ? Math.round(session.total_timer_time) : null;
        const distanceM = session.total_distance ?? null;
        const distanceKm = distanceM != null ? distanceM / 1000 : null;
        const avgHr = session.avg_heart_rate ?? null;
        const maxHr = session.max_heart_rate ?? null;
        const elevGain = session.total_ascent ?? null;
        const calories = session.total_calories ?? null;

        // tz from GPS
        let tz: string | null = null;
        let lat = toDeg(session.start_position_lat);
        let lng = toDeg(session.start_position_long);
        if (lat == null || lng == null) {
          for (const r of fit.records || []) {
            const la = toDeg(r.position_lat), lo = toDeg(r.position_long);
            if (la != null && lo != null) { lat = la; lng = lo; break; }
          }
        }
        if (lat != null && lng != null) {
          try { tz = tzlookup(lat, lng); } catch { /* ignore */ }
        }
        if (!tz) tz = "UTC";
        const startDate = localDate(startIso, tz);

        const paceLine = (distanceKm && duration && sport === "Run")
          ? `Pace: ${fmtPace(duration / distanceKm)}` : null;
        const speedLine = (distanceKm && duration && (sport === "Ride" || sport === "Bike"))
          ? `Avg speed: ${(distanceKm / (duration / 3600)).toFixed(1)} km/h` : null;

        const lines = [
          `**${sport} activity** — ${startDate}`,
          distanceKm != null ? `• Distance: ${distanceKm.toFixed(2)} km` : null,
          duration != null ? `• Duration: ${fmtDuration(duration)}` : null,
          paceLine ? `• ${paceLine}` : null,
          speedLine ? `• ${speedLine}` : null,
          elevGain != null ? `• Elevation gain: ${Math.round(elevGain)} m` : null,
          avgHr != null ? `• Avg HR: ${avgHr} bpm${maxHr ? ` (max ${maxHr})` : ""}` : null,
          calories != null ? `• Calories: ${calories}` : null,
          (lat != null && lng != null) ? `• Location: ${lat.toFixed(4)}, ${lng.toFixed(4)} (${tz})` : null,
        ].filter(Boolean);

        const title = `${sport}${distanceKm != null ? ` ${distanceKm.toFixed(1)}km` : ""}${duration != null ? ` · ${fmtDuration(duration)}` : ""}`;
        const description = lines.join("\n");

        // Detect standard race distance (5k / 10k / half_marathon / marathon) within ±3%
        const STD: { key: string; m: number }[] = [
          { key: "5k", m: 5000 },
          { key: "10k", m: 10000 },
          { key: "half_marathon", m: 21097.5 },
          { key: "marathon", m: 42195 },
        ];
        let stdKey: string | null = null;
        if (distanceM != null) {
          let best: { key: string; diff: number } | null = null;
          for (const s of STD) {
            const diff = Math.abs(distanceM - s.m) / s.m;
            if (diff <= 0.03 && (!best || diff < best.diff)) best = { key: s.key, diff };
          }
          stdKey = best?.key ?? null;
        }
        const isRaceish = stdKey != null ||
                         (sport === "Run" && distanceKm != null && distanceKm >= 15) ||
                         /race|marathon|10k|5k|half/i.test(f.file_name);

        result.extraction = {
          event_type: isRaceish ? "race" : "other",
          title: title.slice(0, 200),
          start_date: startDate,
          end_date: null,
          race_distance: stdKey ?? (distanceKm != null ? `${distanceKm.toFixed(1)}K` : null),
          race_result: duration != null ? fmtDuration(duration) : null,
          official_time_seconds: duration ?? null,
          location: (lat != null && lng != null) ? `${lat.toFixed(3)}, ${lng.toFixed(3)}` : null,
          summary: `${sport} on ${startDate}${distanceKm != null ? `, ${distanceKm.toFixed(2)} km` : ""}${duration != null ? ` in ${fmtDuration(duration)}` : ""}.`,
          description,
        };
        result.description_md = description;
      } catch (e) {
        result.error = `FIT parse failed: ${(e as Error).message}`;
        result.extraction = {
          event_type: "other",
          title: cleanTitle(f.file_name),
          start_date: todayISO(),
          description: "FIT file could not be parsed for preview.",
        };
        result.description_md = "FIT file (parse failed during preview).";
      }
      return result;
    }


    if (f.size_bytes && f.size_bytes > MAX_FILE_BYTES) {
      result.error = "File too large for AI extraction (>15MB)";
      return result;
    }

    const mime = f.mime_type || guessMime(f.file_name);
    const isImage = SUPPORTED_IMAGE.includes(mime);
    const isPdf = SUPPORTED_DOC.includes(mime);
    result.kind = isImage ? "image" : isPdf ? "document" : "other";

    if (!isImage && !isPdf) {
      result.extraction = {
        event_type: "other",
        title: cleanTitle(f.file_name),
        start_date: todayISO(),
        description: `Attached file: ${f.file_name}`,
      };
      result.description_md = `Attached file: ${f.file_name}`;
      return result;
    }

    const { data: blob, error: dlErr } = await supabase.storage
      .from("fit-files")
      .download(f.file_path);
    if (dlErr || !blob) {
      result.error = `Storage download failed: ${dlErr?.message}`;
      return result;
    }
    const buf = new Uint8Array(await blob.arrayBuffer());
    const b64 = base64Encode(buf);

    const systemPrompt = `You read medical/sports documents and propose a "training key event" record.

Return STRICT JSON:
{
  "event_type": "injury_illness" | "race" | "other",
  "title": "<= 80 chars, descriptive (e.g. 'Left calf strain' or 'Berlin Marathon 2024')",
  "start_date": "YYYY-MM-DD",   // date the event happened / injury began / race took place
  "end_date": "YYYY-MM-DD" | null,
  "body_part": "if injury",
  "severity": 1-5 if injury,
  "race_distance": "if race, e.g. '10K', 'Half marathon'",
  "race_result": "if race, e.g. '42:18, 5th overall'",
  "race_priority": "A" | "B" | "C" | null,
  "location": "venue/city if mentioned",
  "summary": "1-2 sentence plain-language summary",
  "description": "rich markdown with key facts, diagnosis, metrics, recommendations, dates. Use ** for headers and • for bullets. Do NOT invent data."
}

Rules:
- Use today's date ONLY if no date is in the document.
- Be specific. Use the user's own units.
- Omit fields that don't apply (use null).`;

    const userContent: any[] = [
      { type: "text", text: "Extract a training key event from this file." },
    ];
    if (isPdf) {
      userContent.push({
        type: "file",
        file: { filename: f.file_name, file_data: `data:${mime};base64,${b64}` },
      });
    } else {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mime};base64,${b64}` },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      result.error = `AI gateway ${aiRes.status}`;
      return result;
    }
    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch {
      result.error = "AI returned invalid JSON";
      return result;
    }

    // Sanitize
    const validTypes = ["injury_illness", "race", "other"];
    if (!validTypes.includes(parsed.event_type)) parsed.event_type = "other";
    if (!isISODate(parsed.start_date)) parsed.start_date = todayISO();
    if (parsed.end_date && !isISODate(parsed.end_date)) parsed.end_date = null;
    parsed.title = (parsed.title || cleanTitle(f.file_name)).slice(0, 200);
    if (parsed.severity != null) {
      const s = Number(parsed.severity);
      parsed.severity = Number.isFinite(s) && s >= 1 && s <= 5 ? Math.round(s) : null;
    }
    if (parsed.race_priority && !["A", "B", "C"].includes(parsed.race_priority)) parsed.race_priority = null;

    result.extraction = parsed;
    result.description_md = parsed.description || parsed.summary || "";
    return result;
  } catch (e) {
    result.error = (e as Error).message;
    return result;
  }
}

function matchScore(proposed: any, ev: any): number {
  let score = 0;
  if (proposed.event_type === ev.event_type) score += 3;
  const dd = daysApart(proposed.start_date, ev.start_date);
  if (dd === 0) score += 6;
  else if (dd <= 2) score += 4;
  else if (dd <= 7) score += 2;
  else if (dd <= 14) score += 1;
  else return 0; // too far apart, ignore
  if (proposed.body_part && ev.body_part && norm(proposed.body_part) === norm(ev.body_part)) score += 3;
  if (proposed.race_distance && ev.race_distance && norm(proposed.race_distance) === norm(ev.race_distance)) score += 2;
  if (proposed.location && ev.location && norm(proposed.location).includes(norm(ev.location))) score += 1;
  if (proposed.title && ev.title) {
    const t1 = tokenize(proposed.title);
    const t2 = tokenize(ev.title);
    const overlap = t1.filter((t) => t2.includes(t)).length;
    if (overlap >= 2) score += 3;
    else if (overlap === 1) score += 1;
  }
  return score;
}

function mergeProposed(a: any, b: any) {
  return {
    event_type: a.event_type,
    title: a.title || b.title,
    start_date: a.start_date,
    end_date: a.end_date || b.end_date || null,
    body_part: a.body_part || b.body_part || null,
    severity: a.severity ?? b.severity ?? null,
    race_distance: a.race_distance || b.race_distance || null,
    race_result: a.race_result || b.race_result || null,
    race_priority: a.race_priority || b.race_priority || null,
    location: a.location || b.location || null,
    summary: [a.summary, b.summary].filter(Boolean).join(" "),
    description: [a.description, b.description].filter(Boolean).join("\n\n"),
  };
}

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/i).filter((t) => t.length >= 3);
}
function norm(s: string): string { return s.toLowerCase().trim(); }
function daysApart(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  if (isNaN(da) || isNaN(db)) return 999;
  return Math.abs((da - db) / 86400000);
}
function isISODate(s: any): boolean {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function todayISO(): string { return new Date().toISOString().slice(0, 10); }
function cleanTitle(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_\-]+/g, " ").slice(0, 80);
}
function guessMime(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  if (n.endsWith(".fit")) return "application/octet-stream";
  return "application/octet-stream";
}
function base64Encode(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

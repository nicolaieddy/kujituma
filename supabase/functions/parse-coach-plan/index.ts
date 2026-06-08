import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { autoMatchTrainingPlan } from "../_shared/auto-match-plan.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ParsedWorkout {
  day_of_week: number; // 0=Mon ... 6=Sun
  workout_type: string;
  title: string;
  description?: string;
  target_distance_meters?: number | null;
  target_duration_seconds?: number | null;
  target_pace_per_km?: number | null;
  notes?: string;
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
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const weekStart: string | undefined = body.week_start;
    const sourceType: string = body.source_type; // text|image|document
    const text: string | undefined = body.text;
    const filePath: string | undefined = body.file_path; // path inside coach-plans bucket
    const fileName: string | undefined = body.file_name;
    const mimeType: string | undefined = body.mime_type;
    const goalIds: string[] = Array.isArray(body.goal_ids) ? body.goal_ids : [];

    if (!weekStart) return json({ error: "week_start required" }, 400);
    if (!["text", "image", "document"].includes(sourceType)) {
      return json({ error: "invalid source_type" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    // Build user content for AI
    const userContent: any[] = [{ type: "text", text: buildPrompt(weekStart) }];

    if (sourceType === "text") {
      if (!text || !text.trim()) return json({ error: "text required" }, 400);
      userContent.push({ type: "text", text: `\n\nCOACH PLAN TEXT:\n${text}` });
    } else {
      if (!filePath) return json({ error: "file_path required" }, 400);
      // Download file from storage
      const { data: blob, error: dlErr } = await supabase.storage
        .from("coach-plans")
        .download(filePath);
      if (dlErr || !blob) return json({ error: `Could not read file: ${dlErr?.message}` }, 500);
      const buf = new Uint8Array(await blob.arrayBuffer());
      const b64 = base64Encode(buf);
      const mime = mimeType || blob.type || (sourceType === "image" ? "image/png" : "application/pdf");
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mime};base64,${b64}` },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You convert a coach's weekly training plan into structured JSON. Be precise; only invent days that are clearly present. Return ONLY valid JSON matching the schema in the prompt.",
          },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) return json({ error: "Rate limited, try again shortly." }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted. Add credits in Workspace settings." }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: { workouts?: ParsedWorkout[] } = {};
    try { parsed = JSON.parse(content); } catch {
      console.error("Bad AI JSON:", content);
      return json({ error: "AI returned invalid JSON" }, 500);
    }

    const rawWorkouts: ParsedWorkout[] = parsed.workouts ?? [];

    // ===== Field-mapping check =====
    // Validate that AI-derived fields land in the correct columns/paths before persisting.
    const mappingIssues: Array<{ index: number; field: string; reason: string }> = [];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return json({ error: "week_start must be YYYY-MM-DD" }, 400);
    }

    // Attachment path must live under the caller's user folder inside the coach-plans bucket.
    if (sourceType !== "text" && filePath) {
      const firstSegment = filePath.split("/")[0];
      if (firstSegment !== userId) {
        return json({
          error: "Attachment path must be stored under your own user folder in the coach-plans bucket.",
          expected_prefix: `${userId}/`,
          received: filePath,
        }, 400);
      }
    }

    const workouts = rawWorkouts
      .map((w, idx) => {
        if (!w || typeof w.day_of_week !== "number" || w.day_of_week < 0 || w.day_of_week > 6) {
          mappingIssues.push({ index: idx, field: "day_of_week", reason: "must be integer 0-6 (Mon-Sun)" });
          return null;
        }
        if (typeof w.title !== "string" || !w.title.trim()) {
          mappingIssues.push({ index: idx, field: "title", reason: "missing" });
          return null;
        }
        for (const k of ["target_distance_meters","target_duration_seconds","target_pace_per_km"] as const) {
          const v = (w as any)[k];
          if (v != null && (typeof v !== "number" || !Number.isFinite(v) || v < 0)) {
            mappingIssues.push({ index: idx, field: k, reason: "must be a non-negative number" });
          }
        }
        return {
          day_of_week: Math.round(w.day_of_week),
          workout_type: (w.workout_type || "Run").toString().slice(0, 40),
          title: w.title.toString().slice(0, 200),
          description: (w.description ?? "").toString().slice(0, 2000),
          target_distance_meters: numOrNull(w.target_distance_meters),
          target_duration_seconds: numOrNull(w.target_duration_seconds),
          target_pace_per_km: numOrNull(w.target_pace_per_km),
          notes: (w.notes ?? "").toString().slice(0, 1000),
          order_index: idx,
        };
      })
      .filter((w): w is NonNullable<typeof w> => w !== null);

    if (workouts.length === 0) {
      return json({
        error: "Could not extract any workouts from that source.",
        mapping_issues: mappingIssues,
      }, 422);
    }

    const mappingReport = {
      checked_at: new Date().toISOString(),
      week_start: weekStart,
      attachment: sourceType === "text"
        ? null
        : { bucket: "coach-plans", path: filePath, file_name: fileName ?? null, mime: mimeType ?? null },
      total_parsed: rawWorkouts.length,
      total_mapped: workouts.length,
      dropped: rawWorkouts.length - workouts.length,
      issues: mappingIssues,
      fields: {
        notes_target_column: "training_plan_workouts.notes",
        description_target_column: "training_plan_workouts.description",
        date_basis: "week_start + day_of_week (0=Mon)",
        attachment_target_bucket: "coach-plans",
      },
    };

    // Insert the import row (with mapping report + source notes/attachment metadata)
    const { data: importRow, error: impErr } = await supabase
      .from("training_plan_imports")
      .insert({
        user_id: userId,
        week_start: weekStart,
        source_type: sourceType,
        source_text: sourceType === "text" ? text : null,
        source_file_path: sourceType === "text" ? null : filePath,
        source_file_name: fileName ?? null,
        source_mime: mimeType ?? null,
        parsed_summary: { workouts },
        field_mapping_report: mappingReport,
        workout_count: workouts.length,
      })
      .select("id")
      .single();
    if (impErr || !importRow) {
      console.error("import insert err", impErr);
      return json({ error: impErr?.message || "Failed to save import" }, 500);
    }

    const rows = workouts.map(w => ({
      user_id: userId,
      week_start: weekStart,
      source_import_id: importRow.id,
      ...w,
    }));
    const { data: created, error: wErr } = await supabase
      .from("training_plan_workouts")
      .insert(rows)
      .select("id");
    if (wErr) {
      console.error("workout insert err", wErr);
      return json({ error: wErr.message }, 500);
    }

    if (goalIds.length > 0 && created && created.length > 0) {
      const links = created.flatMap(c => goalIds.map(gid => ({ workout_id: c.id, goal_id: gid })));
      await supabase.from("training_workout_goals").insert(links);
    }

    return json({
      import_id: importRow.id,
      created: created?.length ?? 0,
      workouts,
      mapping_report: mappingReport,
    }, 200);
  } catch (e) {
    console.error("parse-coach-plan fatal:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function buildPrompt(weekStart: string): string {
  return `Convert the coach's training plan into structured JSON for the week starting Monday ${weekStart}.

Days are 0-indexed Monday-first: 0=Mon,1=Tue,2=Wed,3=Thu,4=Fri,5=Sat,6=Sun.

For each session in the plan, output one entry. Multiple sessions on the same day are fine — give each its own entry; use order_index implicitly by listing order.

Schema (return ONLY this JSON, no prose, no markdown):
{
  "workouts": [
    {
      "day_of_week": 0,
      "workout_type": "Run" | "Ride" | "Strength" | "Swim" | "Cross" | "Rest" | "Other",
      "title": "short label e.g. 'Threshold 5x1km'",
      "description": "fuller description as written by the coach",
      "target_distance_meters": number | null,
      "target_duration_seconds": number | null,
      "target_pace_per_km": number | null,
      "notes": "extra notes, RPE, HR zones, etc."
    }
  ]
}

Rules:
- Convert km -> meters (e.g. 14.4 km -> 14400). Convert miles -> meters (1 mi = 1609.34).
- Convert hh:mm or "1h 10m" -> seconds.
- Pace "5:00/km" -> 300 seconds per km.
- If the coach lists a rest day explicitly, include it with workout_type "Rest".
- Skip days that aren't mentioned. Do not invent workouts.
- Keep titles concise (<= 60 chars).`;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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

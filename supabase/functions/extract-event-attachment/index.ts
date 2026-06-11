import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPPORTED_IMAGE = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const SUPPORTED_DOC = ["application/pdf"];
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB cap for AI extraction

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
    const attachmentId: string | undefined = body.attachment_id;
    if (!attachmentId) return json({ error: "attachment_id required" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    // Load attachment + parent event for context
    const { data: att, error: attErr } = await supabase
      .from("training_event_attachments")
      .select("id, user_id, event_id, kind, file_path, file_name, mime_type, size_bytes")
      .eq("id", attachmentId)
      .eq("user_id", userId)
      .single();
    if (attErr || !att) return json({ error: "Attachment not found" }, 404);

    if (att.kind === "fit" || att.kind === "note") {
      await supabase
        .from("training_event_attachments")
        .update({ extraction_status: "skipped", extracted_at: new Date().toISOString() })
        .eq("id", att.id);
      return json({ status: "skipped", reason: "fit/note attachments don't need AI extraction" });
    }

    if (!att.file_path) return json({ error: "Attachment has no file" }, 400);

    if (att.size_bytes && att.size_bytes > MAX_FILE_BYTES) {
      await supabase
        .from("training_event_attachments")
        .update({
          extraction_status: "failed",
          extraction_error: "File too large for AI extraction (>15MB)",
        })
        .eq("id", att.id);
      return json({ error: "File too large for AI extraction" }, 413);
    }

    const { data: event } = await supabase
      .from("training_events")
      .select("id, event_type, title, description, start_date, end_date, body_part, race_distance, race_priority, race_result, severity, location")
      .eq("id", att.event_id)
      .eq("user_id", userId)
      .single();

    // Mark as processing
    await supabase
      .from("training_event_attachments")
      .update({ extraction_status: "processing", extraction_error: null })
      .eq("id", att.id);

    // Download file
    const { data: blob, error: dlErr } = await supabase.storage
      .from("fit-files")
      .download(att.file_path);
    if (dlErr || !blob) {
      await markFailed(supabase, att.id, `Storage download failed: ${dlErr?.message}`);
      return json({ error: `Could not read file: ${dlErr?.message}` }, 500);
    }

    const mime = att.mime_type || blob.type || guessMime(att.file_name);
    const isImage = SUPPORTED_IMAGE.includes(mime);
    const isPdf = SUPPORTED_DOC.includes(mime);

    if (!isImage && !isPdf) {
      await supabase
        .from("training_event_attachments")
        .update({
          extraction_status: "skipped",
          extracted_at: new Date().toISOString(),
          extraction_error: `Unsupported file type for AI: ${mime}`,
        })
        .eq("id", att.id);
      return json({ status: "skipped", reason: `unsupported mime: ${mime}` });
    }

    const buf = new Uint8Array(await blob.arrayBuffer());
    const b64 = base64Encode(buf);

    const systemPrompt = `You are a medical/sports document reader. The user attached a file to a training "key event".
Event context:
- Type: ${event?.event_type ?? "unknown"}
- Title: ${event?.title ?? ""}
- Start: ${event?.start_date ?? ""}${event?.end_date ? ` → ${event.end_date}` : ""}
${event?.body_part ? `- Body part: ${event.body_part}\n` : ""}${event?.race_distance ? `- Race: ${event.race_distance}\n` : ""}${event?.location ? `- Location: ${event.location}\n` : ""}
Extract everything useful for future training analysis. Be concise but specific. Use the user's own units.
Return STRICT JSON with this shape:
{
  "summary": "1-2 sentence plain-language summary",
  "key_facts": ["short bullet", "short bullet", ...],
  "dates": ["YYYY-MM-DD ...", ...],
  "metrics": { "race_time": "...", "distance": "...", "pace": "...", "hr_avg": "...", ... },
  "diagnosis": "if injury/illness, the diagnosis or condition",
  "recommendations": ["physio plan, return-to-run notes, medications, etc."],
  "raw_text_excerpt": "Up to 1500 chars of the most informative text verbatim from the document"
}
Omit fields that don't apply. NEVER invent data.`;

    const userContent: any[] = [
      { type: "text", text: "Extract the information from this attached file." },
    ];
    if (isPdf) {
      userContent.push({
        type: "file",
        file: { filename: att.file_name, file_data: `data:${mime};base64,${b64}` },
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
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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

    if (aiRes.status === 429) {
      await markFailed(supabase, att.id, "Rate limited");
      return json({ error: "Rate limited, try again shortly." }, 429);
    }
    if (aiRes.status === 402) {
      await markFailed(supabase, att.id, "AI credits exhausted");
      return json({ error: "AI credits exhausted. Add credits in Workspace settings." }, 402);
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI extract error", aiRes.status, t);
      await markFailed(supabase, att.id, `AI gateway error ${aiRes.status}`);
      return json({ error: "AI gateway error" }, 500);
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch {
      await markFailed(supabase, att.id, "AI returned invalid JSON");
      return json({ error: "AI returned invalid JSON" }, 500);
    }

    const description = renderExtraction(parsed);

    await supabase
      .from("training_event_attachments")
      .update({
        description,
        extraction_status: "done",
        extracted_at: new Date().toISOString(),
        extraction_error: null,
      })
      .eq("id", att.id);

    // Append a short note to the parent event description so the event itself surfaces the insight
    if (event && parsed?.summary) {
      const stamp = `[AI · ${att.file_name}] ${parsed.summary}`;
      const existing = (event.description ?? "").trim();
      // Avoid duplicating if we already added the same line
      if (!existing.includes(`[AI · ${att.file_name}]`)) {
        const next = existing ? `${existing}\n\n${stamp}` : stamp;
        await supabase
          .from("training_events")
          .update({ description: next.slice(0, 4000) })
          .eq("id", event.id)
          .eq("user_id", userId);
      }
    }

    return json({ status: "done", extraction: parsed });
  } catch (e) {
    console.error("extract-event-attachment fatal", e);
    return json({ error: (e as Error).message }, 500);
  }
});

async function markFailed(supabase: any, id: string, msg: string) {
  await supabase
    .from("training_event_attachments")
    .update({ extraction_status: "failed", extraction_error: msg })
    .eq("id", id);
}

function renderExtraction(p: any): string {
  if (!p || typeof p !== "object") return "";
  const lines: string[] = [];
  if (p.summary) lines.push(p.summary);
  if (p.diagnosis) lines.push(`\n**Diagnosis:** ${p.diagnosis}`);
  if (Array.isArray(p.key_facts) && p.key_facts.length) {
    lines.push("\n**Key facts:**");
    for (const f of p.key_facts) lines.push(`• ${f}`);
  }
  if (p.metrics && typeof p.metrics === "object") {
    const entries = Object.entries(p.metrics).filter(([_, v]) => v != null && v !== "");
    if (entries.length) {
      lines.push("\n**Metrics:**");
      for (const [k, v] of entries) lines.push(`• ${k.replace(/_/g, " ")}: ${v}`);
    }
  }
  if (Array.isArray(p.recommendations) && p.recommendations.length) {
    lines.push("\n**Recommendations:**");
    for (const r of p.recommendations) lines.push(`• ${r}`);
  }
  if (Array.isArray(p.dates) && p.dates.length) {
    lines.push(`\n**Dates referenced:** ${p.dates.join(", ")}`);
  }
  if (p.raw_text_excerpt) {
    lines.push(`\n---\n${p.raw_text_excerpt}`);
  }
  return lines.join("\n").slice(0, 8000);
}

function guessMime(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
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

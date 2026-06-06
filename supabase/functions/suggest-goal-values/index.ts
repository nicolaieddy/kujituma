import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Suggestion {
  value_id: string;
  weight: number; // 1-5
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const goalId: string | undefined = body.goal_id;
    if (!goalId) return json({ error: "goal_id required" }, 400);

    // Fetch goal
    const { data: goal, error: goalErr } = await supabase
      .from("goals")
      .select("id, user_id, title, description, category")
      .eq("id", goalId)
      .eq("user_id", userId)
      .maybeSingle();
    if (goalErr) return json({ error: goalErr.message }, 500);
    if (!goal) return json({ error: "Goal not found" }, 404);

    // Fetch active values
    const { data: values, error: valuesErr } = await supabase
      .from("user_values")
      .select("id, label, statement, feeling")
      .eq("user_id", userId)
      .eq("is_archived", false);
    if (valuesErr) return json({ error: valuesErr.message }, 500);
    if (!values || values.length === 0) {
      return json({ suggestions: [], note: "No values defined" }, 200);
    }

    // Preserve user-edited links: only refresh AI-sourced ones.
    const { data: existing } = await supabase
      .from("goal_value_links")
      .select("value_id, source")
      .eq("goal_id", goalId);
    const userPinnedIds = new Set(
      (existing ?? []).filter((l: any) => l.source === "user").map((l: any) => l.value_id)
    );

    const candidateValues = values.filter((v: any) => !userPinnedIds.has(v.id));
    if (candidateValues.length === 0) {
      return json({ suggestions: [], note: "All values are user-pinned" }, 200);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const prompt = buildPrompt(goal, candidateValues);

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
              "You map personal goals to personal values. Return ONLY valid JSON matching the schema in the prompt. Be selective — only include values that genuinely apply.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) return json({ error: "Rate limited" }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted" }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: { suggestions?: Suggestion[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Could not parse AI output:", content);
      return json({ error: "Invalid AI response" }, 500);
    }

    const validIds = new Set(candidateValues.map((v: any) => v.id));
    const cleaned: Suggestion[] = (parsed.suggestions ?? [])
      .filter((s) => s && validIds.has(s.value_id))
      .map((s) => ({
        value_id: s.value_id,
        weight: Math.max(1, Math.min(5, Math.round(Number(s.weight) || 0))),
        reason: typeof s.reason === "string" ? s.reason.slice(0, 280) : undefined,
      }))
      .filter((s) => s.weight >= 1);

    // Delete previous AI-sourced links for this goal that are NOT in new suggestions
    const newIds = new Set(cleaned.map((s) => s.value_id));
    const toDelete = (existing ?? [])
      .filter((l: any) => l.source === "ai" && !newIds.has(l.value_id))
      .map((l: any) => l.value_id);
    if (toDelete.length > 0) {
      await supabase
        .from("goal_value_links")
        .delete()
        .eq("goal_id", goalId)
        .in("value_id", toDelete);
    }

    // Upsert new AI suggestions
    if (cleaned.length > 0) {
      const rows = cleaned.map((s) => ({
        user_id: userId,
        goal_id: goalId,
        value_id: s.value_id,
        weight: s.weight,
        source: "ai" as const,
        ai_reason: s.reason ?? null,
      }));
      // Only upsert where the existing link is AI-sourced OR doesn't exist
      // Filter out user-pinned (already excluded by candidateValues), so safe to upsert.
      const { error: upsertErr } = await supabase
        .from("goal_value_links")
        .upsert(rows, { onConflict: "goal_id,value_id" });
      if (upsertErr) {
        console.error("Upsert error:", upsertErr);
        return json({ error: upsertErr.message }, 500);
      }
    }

    return json({ suggestions: cleaned }, 200);
  } catch (e) {
    console.error("suggest-goal-values fatal:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function buildPrompt(goal: any, values: any[]): string {
  const valueList = values
    .map((v) => `- id: ${v.id}\n  label: ${v.label}\n  statement: ${v.statement || "(none)"}`)
    .join("\n");

  return `Goal:
- title: ${goal.title}
- description: ${goal.description || "(none)"}
- category: ${goal.category || "(none)"}

User's personal values (only choose from these):
${valueList}

Decide which values this goal genuinely serves. Skip values that are unrelated.
For each chosen value, assign a weight 1-5:
  1 = touches the value lightly
  3 = clearly serves the value
  5 = central to / fundamentally about the value

Return ONLY JSON in this exact shape (no prose, no markdown):
{
  "suggestions": [
    { "value_id": "<uuid>", "weight": 1-5, "reason": "<one short sentence>" }
  ]
}

If no values truly apply, return { "suggestions": [] }.`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

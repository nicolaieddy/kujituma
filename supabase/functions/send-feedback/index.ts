import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface FeedbackPayload {
  message: string;
  page_url?: string;
  user_agent?: string;
}

function validate(body: unknown): { ok: true; data: FeedbackPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body" };
  const b = body as Record<string, unknown>;
  const message = typeof b.message === "string" ? b.message.trim() : "";
  if (!message) return { ok: false, error: "Message is required" };
  if (message.length > 5000) return { ok: false, error: "Message too long (max 5000 chars)" };
  const page_url = typeof b.page_url === "string" ? b.page_url.slice(0, 500) : undefined;
  const user_agent = typeof b.user_agent === "string" ? b.user_agent.slice(0, 500) : undefined;
  return { ok: true, data: { message, page_url, user_agent } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const parsed = validate(await req.json().catch(() => null));
    if (!parsed.ok) {
      return new Response(JSON.stringify({ error: parsed.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const userEmail = user.email ?? null;
    const displayName =
      (profile?.display_name as string | undefined) ||
      (profile?.full_name as string | undefined) ||
      userEmail ||
      user.id;

    // Insert submission
    const { data: inserted, error: insErr } = await admin
      .from("feedback_submissions")
      .insert({
        user_id: user.id,
        user_email: userEmail,
        message: parsed.data.message,
        page_url: parsed.data.page_url ?? null,
        user_agent: parsed.data.user_agent ?? null,
      })
      .select("id")
      .single();

    if (insErr) {
      console.error("insert error", insErr);
      return new Response(JSON.stringify({ error: "Failed to save feedback" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notify all admins in-app
    const { data: admins } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      const preview = parsed.data.message.length > 120
        ? parsed.data.message.slice(0, 117) + "..."
        : parsed.data.message;
      const notifRows = admins.map((a: { user_id: string }) => ({
        user_id: a.user_id,
        type: "feedback_received",
        message: `New feedback from ${displayName}: ${preview}`,
        triggered_by_user_id: user.id,
        is_read: false,
      }));
      const { error: notifErr } = await admin.from("notifications").insert(notifRows);
      if (notifErr) console.error("notification insert error", notifErr);
    }

    return new Response(
      JSON.stringify({ ok: true, id: inserted.id, emailed: false }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("send-feedback error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

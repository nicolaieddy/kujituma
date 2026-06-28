import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "nicolaieddy@gmail.com";
const FROM_EMAIL = "Kujituma Feedback <feedback@notify.kujituma.com>";

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendEmail(args: {
  fromEmail: string;
  fromName: string;
  recipientEmail: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return { ok: false, error: "LOVABLE_API_KEY missing" };

  try {
    // Lovable Emails API
    const res = await fetch("https://api.lovable.app/email/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: { email: args.fromEmail, name: args.fromName },
        to: [{ email: args.recipientEmail }],
        subject: args.subject,
        html: args.htmlBody,
        text: args.textBody,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `${res.status}: ${txt.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
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

    // Validate user via anon client + JWT
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

    // Get profile for display name
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

    // Send email (best-effort)
    const subject = `[Kujituma Feedback] from ${displayName}`;
    const text = [
      `From: ${displayName} <${userEmail ?? "no-email"}>`,
      `User ID: ${user.id}`,
      `Page: ${parsed.data.page_url ?? "n/a"}`,
      `UA: ${parsed.data.user_agent ?? "n/a"}`,
      ``,
      parsed.data.message,
    ].join("\n");
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111">
        <h2 style="margin:0 0 12px">New Kujituma Feedback</h2>
        <p style="margin:0 0 4px"><strong>From:</strong> ${escapeHtml(displayName)} ${
      userEmail ? `&lt;${escapeHtml(userEmail)}&gt;` : ""
    }</p>
        <p style="margin:0 0 4px"><strong>User ID:</strong> ${escapeHtml(user.id)}</p>
        <p style="margin:0 0 4px"><strong>Page:</strong> ${escapeHtml(parsed.data.page_url ?? "n/a")}</p>
        <p style="margin:0 0 16px;color:#666;font-size:12px"><strong>UA:</strong> ${escapeHtml(
          parsed.data.user_agent ?? "n/a",
        )}</p>
        <div style="white-space:pre-wrap;background:#f7f7f8;border-radius:8px;padding:16px;border:1px solid #eee">${escapeHtml(
          parsed.data.message,
        )}</div>
      </div>`;

    const emailResult = await sendEmail({
      fromEmail: "feedback@notify.kujituma.com",
      fromName: "Kujituma Feedback",
      recipientEmail: ADMIN_EMAIL,
      subject,
      htmlBody: html,
      textBody: text,
    });

    if (emailResult.ok) {
      await admin
        .from("feedback_submissions")
        .update({ emailed_at: new Date().toISOString() })
        .eq("id", inserted.id);
    } else {
      console.error("email send failed", emailResult.error);
      await admin
        .from("feedback_submissions")
        .update({ email_error: emailResult.error ?? "unknown" })
        .eq("id", inserted.id);
    }

    return new Response(
      JSON.stringify({ ok: true, id: inserted.id, emailed: emailResult.ok }),
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

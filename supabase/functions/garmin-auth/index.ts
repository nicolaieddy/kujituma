// Garmin unofficial-bridge auth function.
// Actions:
//   POST  ?action=connect     { email, password }   → validate login, encrypt + store credentials
//   GET   ?action=status                            → return connection state
//   POST  ?action=disconnect                        → delete credentials
//   POST  ?action=sync-now                          → trigger garmin-sync for current user
import { createClient } from "npm:@supabase/supabase-js@2";
import { GarminConnect } from "npm:garmin-connect@1.6.1";
import { encryptString } from "../_shared/garmin-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimData, error: claimErr } = await userClient.auth.getClaims(
    token,
  );
  if (claimErr || !claimData?.claims) {
    return json({ error: "Unauthorized" }, 401);
  }
  const userId = claimData.claims.sub as string;

  const adminClient = createClient(supabaseUrl, serviceKey);
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    if (action === "status") {
      const { data } = await adminClient
        .from("garmin_connections")
        .select(
          "garmin_user_id, connected_at, last_sync_at, last_login_at, last_error",
        )
        .eq("user_id", userId)
        .maybeSingle();
      return json({ connected: !!data, connection: data ?? null });
    }

    if (action === "connect" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const email = String(body.email ?? "").trim();
      const password = String(body.password ?? "");
      if (!email || !password) {
        return json({ error: "Email and password required" }, 400);
      }

      // Validate by attempting a real login
      const gc = new GarminConnect({ username: email, password });
      try {
        await gc.login();
      } catch (err) {
        console.error("Garmin login failed:", err);
        return json(
          {
            error:
              "Garmin login failed. Double-check your email/password and that 2FA is disabled.",
          },
          400,
        );
      }

      const garminUserId = (gc as any).userHash ?? null;
      const encEmail = await encryptString(email);
      const encPwd = await encryptString(password);

      const { error: upErr } = await adminClient
        .from("garmin_connections")
        .upsert(
          {
            user_id: userId,
            garmin_user_id: garminUserId,
            encrypted_email: encEmail,
            encrypted_password: encPwd,
            connected_at: new Date().toISOString(),
            last_login_at: new Date().toISOString(),
            last_error: null,
            session_tokens: null,
            sync_anchor: null,
          },
          { onConflict: "user_id" },
        );
      if (upErr) throw upErr;

      // Kick off initial sync (fire-and-forget)
      fetch(`${supabaseUrl}/functions/v1/garmin-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ user_id: userId, initial: true }),
      }).catch((e) => console.error("initial sync trigger failed:", e));

      return json({ success: true });
    }

    if (action === "disconnect" && req.method === "POST") {
      await adminClient
        .from("garmin_connections")
        .delete()
        .eq("user_id", userId);
      return json({ success: true });
    }

    if (action === "sync-now" && req.method === "POST") {
      const res = await fetch(`${supabaseUrl}/functions/v1/garmin-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });
      const result = await res.json().catch(() => ({}));
      return json({ success: res.ok, result }, res.ok ? 200 : 500);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("garmin-auth error:", err);
    return json({ error: (err as Error).message ?? "Internal error" }, 500);
  }
});

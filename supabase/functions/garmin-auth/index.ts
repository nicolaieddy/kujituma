// Garmin Connect Health API — OAuth 2.0 (PKCE) auth flow.
// Actions: authorize | callback | status | disconnect
// Spec: https://developer.garmin.com/gc-developer-program/health-api/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GARMIN_CLIENT_ID = Deno.env.get("GARMIN_CLIENT_ID");
const GARMIN_CLIENT_SECRET = Deno.env.get("GARMIN_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GARMIN_AUTHORIZE_URL = "https://connect.garmin.com/oauth2Confirm";
const GARMIN_TOKEN_URL = "https://diauth.garmin.com/di-oauth2-service/oauth/token";
const GARMIN_USER_ID_URL = "https://apis.garmin.com/wellness-api/rest/user/id";

function b64url(bytes: Uint8Array): string {
  let str = btoa(String.fromCharCode(...bytes));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(input: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return new Uint8Array(buf);
}

function genVerifier(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    const authHeader = req.headers.get("authorization");

    // Most actions require an authenticated user
    const requireUser = async () => {
      if (!authHeader) throw new Error("Authorization required");
      const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error } = await sb.auth.getUser();
      if (error || !user) throw new Error("Not authenticated");
      return user;
    };

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // === AUTHORIZE: build Garmin authorize URL, store PKCE verifier ===
    if (action === "authorize") {
      if (!GARMIN_CLIENT_ID) throw new Error("GARMIN_CLIENT_ID not configured");
      const redirectUri = url.searchParams.get("redirect_uri");
      if (!redirectUri) throw new Error("redirect_uri required");
      const user = await requireUser();

      const state = crypto.randomUUID();
      const verifier = genVerifier();
      const challenge = b64url(await sha256(verifier));

      const { error: stateErr } = await admin.from("garmin_oauth_states").insert({
        state,
        user_id: user.id,
        code_verifier: verifier,
        redirect_uri: redirectUri,
      });
      if (stateErr) throw new Error(`Failed to store OAuth state: ${stateErr.message}`);

      const authUrl = new URL(GARMIN_AUTHORIZE_URL);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("client_id", GARMIN_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("code_challenge", challenge);
      authUrl.searchParams.set("code_challenge_method", "S256");

      return json({ url: authUrl.toString(), state });
    }

    // === CALLBACK: exchange code for tokens, save connection ===
    if (action === "callback") {
      if (!GARMIN_CLIENT_ID || !GARMIN_CLIENT_SECRET) throw new Error("Garmin credentials not configured");
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) throw new Error("Missing code or state");
      const user = await requireUser();

      // Look up the PKCE verifier we stored at authorize-time
      const { data: stateRow, error: stateErr } = await admin
        .from("garmin_oauth_states")
        .select("*")
        .eq("state", state)
        .eq("user_id", user.id)
        .maybeSingle();

      if (stateErr || !stateRow) throw new Error("OAuth state not found or expired");
      if (new Date(stateRow.expires_at) < new Date()) throw new Error("OAuth state expired");

      // Exchange code for tokens
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: GARMIN_CLIENT_ID,
        client_secret: GARMIN_CLIENT_SECRET,
        code,
        code_verifier: stateRow.code_verifier,
        redirect_uri: stateRow.redirect_uri,
      });

      const tokRes = await fetch(GARMIN_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const tokJson = await tokRes.json();
      if (!tokRes.ok) throw new Error(`Token exchange failed: ${JSON.stringify(tokJson)}`);

      const { access_token, refresh_token, expires_in, refresh_token_expires_in, scope } = tokJson;
      const tokenExpiresAt = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString();
      const refreshExpiresAt = refresh_token_expires_in
        ? new Date(Date.now() + refresh_token_expires_in * 1000).toISOString()
        : null;

      // Fetch the Garmin user id (stable across token refreshes — used to route webhooks)
      const idRes = await fetch(GARMIN_USER_ID_URL, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const idJson = await idRes.json();
      if (!idRes.ok) throw new Error(`Failed to fetch Garmin user id: ${JSON.stringify(idJson)}`);
      const garminUserId = idJson.userId ?? idJson.user_id;
      if (!garminUserId) throw new Error("Garmin user id missing from response");

      // Upsert the connection
      const { error: upErr } = await admin.from("garmin_connections").upsert(
        {
          user_id: user.id,
          garmin_user_id: garminUserId,
          access_token,
          refresh_token,
          token_expires_at: tokenExpiresAt,
          refresh_token_expires_at: refreshExpiresAt,
          scopes: scope ?? null,
          connected_at: new Date().toISOString(),
          last_error: null,
        },
        { onConflict: "user_id" },
      );
      if (upErr) throw new Error(`Failed to save connection: ${upErr.message}`);

      // Clean up the OAuth state row
      await admin.from("garmin_oauth_states").delete().eq("state", state);

      // Trigger a 30-day backfill (fire and forget)
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/garmin-backfill`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id: user.id, days: 30 }),
        });
      } catch (e) {
        console.warn("Backfill kickoff failed (non-fatal):", e);
      }

      return json({ connected: true, garmin_user_id: garminUserId });
    }

    // === STATUS ===
    if (action === "status") {
      const user = await requireUser();
      const { data, error } = await admin
        .from("garmin_connections")
        .select("garmin_user_id, connected_at, last_sync_at, scopes, last_error")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return json({ connected: !!data, connection: data });
    }

    // === DISCONNECT ===
    if (action === "disconnect") {
      const user = await requireUser();
      const { error } = await admin.from("garmin_connections").delete().eq("user_id", user.id);
      if (error) throw error;
      return json({ disconnected: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("garmin-auth error:", msg);
    return json({ error: msg }, 500);
  }
});

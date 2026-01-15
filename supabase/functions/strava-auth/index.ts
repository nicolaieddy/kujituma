import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID");
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    const authHeader = req.headers.get("authorization");

    // === AUTHORIZE: Generate Strava OAuth URL ===
    if (action === "authorize") {
      if (!STRAVA_CLIENT_ID) {
        throw new Error("STRAVA_CLIENT_ID not configured");
      }

      const redirectUri = url.searchParams.get("redirect_uri");
      if (!redirectUri) {
        throw new Error("redirect_uri is required");
      }

      // Generate state for CSRF (though we rely on auth token for security)
      const state = crypto.randomUUID();

      const authUrl = new URL("https://www.strava.com/oauth/authorize");
      authUrl.searchParams.set("client_id", STRAVA_CLIENT_ID);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("approval_prompt", "auto");
      authUrl.searchParams.set("scope", "read,activity:read_all");
      authUrl.searchParams.set("state", state);

      return new Response(JSON.stringify({ url: authUrl.toString(), state }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === CALLBACK: Exchange code for tokens ===
    if (action === "callback") {
      const code = url.searchParams.get("code");

      if (!code) {
        throw new Error("No authorization code provided");
      }

      if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
        throw new Error("Strava credentials not configured");
      }

      if (!authHeader) {
        throw new Error("Authorization required");
      }

      // Get the authenticated user
      const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Exchange code for tokens with Strava
      const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Strava token exchange failed:", errorText);
        throw new Error("Failed to exchange authorization code");
      }

      const tokenData = await tokenResponse.json();

      // Use service role to store connection
      const adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      const { error: upsertError } = await adminClient
        .from("strava_connections")
        .upsert({
          user_id: user.id,
          strava_athlete_id: tokenData.athlete.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
          scope: tokenData.scope || "read,activity:read_all",
          athlete_firstname: tokenData.athlete.firstname,
          athlete_lastname: tokenData.athlete.lastname,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (upsertError) {
        console.error("Failed to save connection:", upsertError);
        throw new Error("Failed to save Strava connection");
      }

      return new Response(JSON.stringify({
        success: true,
        athlete: {
          id: tokenData.athlete.id,
          firstname: tokenData.athlete.firstname,
          lastname: tokenData.athlete.lastname,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === DISCONNECT: Remove Strava connection ===
    if (action === "disconnect") {
      if (!authHeader) {
        throw new Error("Authorization required");
      }

      const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      const { error: deleteError } = await supabase
        .from("strava_connections")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) {
        throw new Error(`Failed to disconnect: ${deleteError.message}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === STATUS: Check connection status ===
    if (action === "status") {
      if (!authHeader) {
        throw new Error("Authorization required");
      }

      const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      const { data: connection, error: fetchError } = await supabase
        .from("strava_connections")
        .select("strava_athlete_id, athlete_firstname, athlete_lastname, created_at, updated_at, last_synced_at, auto_sync_enabled")
        .eq("user_id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw new Error(`Failed to fetch status: ${fetchError.message}`);
      }

      return new Response(JSON.stringify({
        connected: !!connection,
        connection: connection || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === TOGGLE AUTO-SYNC ===
    if (action === "toggle-auto-sync") {
      if (!authHeader) {
        throw new Error("Authorization required");
      }

      const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      const body = await req.json();
      const enabled = body.enabled === true;

      const { error: updateError } = await supabase
        .from("strava_connections")
        .update({ auto_sync_enabled: enabled })
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(`Failed to update: ${updateError.message}`);
      }

      return new Response(JSON.stringify({ success: true, auto_sync_enabled: enabled }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("Strava auth error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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
    // Get authorization token from request
    const authHeader = req.headers.get("authorization");
    
    if (action === "authorize") {
      // Generate authorization URL for Strava OAuth
      if (!STRAVA_CLIENT_ID) {
        throw new Error("STRAVA_CLIENT_ID not configured");
      }

      // Get the redirect URI from query params or use default.
      // Strava is strict and validates redirect_uri against the app's "Authorization Callback Domain".
      // Strava also tends to normalize callback domains to `www`, so we canonicalize for kujituma.com.
      const requestedRedirectUri = url.searchParams.get("redirect_uri") || `${url.origin}/strava-auth?action=callback`;
      let redirectUri = requestedRedirectUri;

      try {
        const parsed = new URL(requestedRedirectUri);
        if (parsed.hostname === "kujituma.com" || parsed.hostname === "www.kujituma.com") {
          redirectUri = "https://www.kujituma.com/strava-callback";
        }
      } catch {
        // If an invalid URL is provided, fall back to the default.
        redirectUri = `${url.origin}/strava-auth?action=callback`;
      }
      // Store state for CSRF protection
      const state = crypto.randomUUID();
      
      const authUrl = new URL("https://www.strava.com/oauth/authorize");
      authUrl.searchParams.set("client_id", STRAVA_CLIENT_ID);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("approval_prompt", "auto");
      authUrl.searchParams.set("scope", "read,activity:read_all");
      authUrl.searchParams.set("state", state);

      return new Response(JSON.stringify({ 
        url: authUrl.toString(),
        state 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "callback") {
      // Exchange authorization code for tokens
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        throw new Error(`Strava authorization failed: ${error}`);
      }

      if (!code) {
        throw new Error("No authorization code provided");
      }

      if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
        throw new Error("Strava credentials not configured");
      }

      // Exchange code for tokens
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
        throw new Error(`Failed to exchange code: ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      
      // Get user from authorization header
      if (!authHeader) {
        throw new Error("No authorization header provided");
      }

      const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Use service role to upsert connection (to handle encrypted tokens)
      const adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      // Store or update connection
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
        throw new Error(`Failed to save connection: ${upsertError.message}`);
      }

      return new Response(JSON.stringify({ 
        success: true,
        athlete: {
          id: tokenData.athlete.id,
          firstname: tokenData.athlete.firstname,
          lastname: tokenData.athlete.lastname,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      if (!authHeader) {
        throw new Error("No authorization header provided");
      }

      const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Delete connection
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

    if (action === "status") {
      if (!authHeader) {
        throw new Error("No authorization header provided");
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
        .select("strava_athlete_id, athlete_firstname, athlete_lastname, created_at, updated_at")
        .eq("user_id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw new Error(`Failed to fetch status: ${fetchError.message}`);
      }

      return new Response(JSON.stringify({ 
        connected: !!connection,
        connection: connection || null
      }), {
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
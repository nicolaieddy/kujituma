// Garmin Health API — initial 30-day backfill after a user connects.
// Called server-to-server by garmin-auth/callback. Service-role authenticated.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Backfill endpoints — Garmin returns past summaries when called with a time range
const GARMIN_ACTIVITY_BACKFILL = "https://apis.garmin.com/wellness-api/rest/backfill/activities";
const GARMIN_SLEEP_BACKFILL = "https://apis.garmin.com/wellness-api/rest/backfill/sleeps";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Service-role only
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.includes(SUPABASE_SERVICE_ROLE_KEY)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { user_id, days = 30 } = await req.json();
  if (!user_id) {
    return new Response(JSON.stringify({ error: "user_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: conn, error } = await admin
    .from("garmin_connections")
    .select("access_token")
    .eq("user_id", user_id)
    .maybeSingle();

  if (error || !conn) {
    return new Response(JSON.stringify({ error: "Connection not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Garmin backfill is async — they push results to our webhook over the following minutes.
  // Here we just request the time range. Real ingestion happens in garmin-webhook.
  const uploadEndTimeInSeconds = Math.floor(Date.now() / 1000);
  const uploadStartTimeInSeconds = uploadEndTimeInSeconds - days * 24 * 60 * 60;
  const qs = `?summaryStartTimeInSeconds=${uploadStartTimeInSeconds}&summaryEndTimeInSeconds=${uploadEndTimeInSeconds}`;

  const headers = { Authorization: `Bearer ${conn.access_token}` };
  const [actRes, sleepRes] = await Promise.all([
    fetch(`${GARMIN_ACTIVITY_BACKFILL}${qs}`, { method: "GET", headers }),
    fetch(`${GARMIN_SLEEP_BACKFILL}${qs}`, { method: "GET", headers }),
  ]);

  return new Response(
    JSON.stringify({
      requested: true,
      activities_status: actRes.status,
      sleep_status: sleepRes.status,
      note: "Garmin will deliver historical data to garmin-webhook over the next few minutes.",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID");
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

/** Reliable timezone-aware local date derivation using Intl.DateTimeFormat parts */
function getLocalDate(utcIso: string, tz: string): string {
  const d = new Date(utcIso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  const dd = parts.find(p => p.type === "day")!.value;
  return `${y}-${m}-${dd}`;
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
}

async function refreshTokenIfNeeded(
  adminClient: any,
  connection: any
): Promise<string> {
  const expiresAt = new Date(connection.expires_at);
  const now = new Date();
  
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log(`Refreshing token for user ${connection.user_id}...`);
    
    const refreshResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        refresh_token: connection.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!refreshResponse.ok) {
      throw new Error("Failed to refresh Strava token");
    }

    const tokenData = await refreshResponse.json();
    
    await adminClient
      .from("strava_connections")
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", connection.user_id);

    return tokenData.access_token;
  }

  return connection.access_token;
}

async function syncUserActivities(adminClient: any, connection: any): Promise<{ synced: number; matched: number }> {
  const accessToken = await refreshTokenIfNeeded(adminClient, connection);
  const userId = connection.user_id;

  // Get activity mappings
  const { data: mappings } = await adminClient
    .from("activity_mappings")
    .select("*, goals!inner(start_date)")
    .eq("user_id", userId);

  // Calculate date range (last 7 days for daily sync)
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);

  // Fetch recent activities
  const activitiesResponse = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${sevenDaysAgo}&per_page=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!activitiesResponse.ok) {
    throw new Error(`Failed to fetch activities for user ${userId}`);
  }

  const activities: StravaActivity[] = await activitiesResponse.json();

  // Get already synced
  const { data: existingSynced } = await adminClient
    .from("synced_activities")
    .select("strava_activity_id")
    .eq("user_id", userId);

  const syncedIds = new Set((existingSynced || []).map((a: any) => a.strava_activity_id));

  let synced = 0;
  let matched = 0;

  for (const activity of activities) {
    if (syncedIds.has(activity.id)) continue;

    const mapping = mappings?.find((m: any) => 
      m.strava_activity_type === activity.type || 
      m.strava_activity_type === activity.sport_type
    );

    const durationMinutes = Math.round(activity.moving_time / 60);
    const meetsMinDuration = !mapping || durationMinutes >= (mapping.min_duration_minutes || 0);
    const shouldMatch = mapping && meetsMinDuration;

    const syncedActivity = {
      user_id: userId,
      strava_activity_id: activity.id,
      activity_type: activity.sport_type || activity.type,
      activity_name: activity.name,
      start_date: activity.start_date,
      duration_seconds: activity.moving_time,
      distance_meters: activity.distance,
      matched_habit_item_id: shouldMatch ? mapping.habit_item_id : null,
      matched_goal_id: shouldMatch ? mapping.goal_id : null,
      habit_completion_created: false,
    };

    const { error: insertError } = await adminClient
      .from("synced_activities")
      .insert(syncedActivity);

    if (insertError) continue;

    synced++;

    if (shouldMatch) {
      const completionDate = activity.start_date_local.split("T")[0];
      
      const { data: existingCompletion } = await adminClient
        .from("habit_completions")
        .select("id")
        .eq("user_id", userId)
        .eq("goal_id", mapping.goal_id)
        .eq("habit_item_id", mapping.habit_item_id)
        .eq("completion_date", completionDate)
        .single();

      if (!existingCompletion) {
        const { error: completionError } = await adminClient
          .from("habit_completions")
          .insert({
            user_id: userId,
            goal_id: mapping.goal_id,
            habit_item_id: mapping.habit_item_id,
            completion_date: completionDate,
          });

        if (!completionError) {
          matched++;
          await adminClient
            .from("synced_activities")
            .update({ habit_completion_created: true })
            .eq("strava_activity_id", activity.id);
        }
      }
    }
  }

  // Update last_synced_at
  await adminClient
    .from("strava_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId);

  return { synced, matched };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get all users with auto_sync_enabled
    const { data: connections, error: fetchError } = await adminClient
      .from("strava_connections")
      .select("*")
      .eq("auto_sync_enabled", true);

    if (fetchError) {
      throw new Error(`Failed to fetch connections: ${fetchError.message}`);
    }

    console.log(`Found ${connections?.length || 0} users with auto-sync enabled`);

    const results = {
      processed: 0,
      totalSynced: 0,
      totalMatched: 0,
      errors: 0,
    };

    for (const connection of connections || []) {
      try {
        const { synced, matched } = await syncUserActivities(adminClient, connection);
        results.processed++;
        results.totalSynced += synced;
        results.totalMatched += matched;
        console.log(`User ${connection.user_id}: synced ${synced}, matched ${matched}`);
      } catch (error) {
        console.error(`Failed to sync user ${connection.user_id}:`, error);
        results.errors++;
      }
    }

    console.log("Scheduled sync complete:", results);

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scheduled sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

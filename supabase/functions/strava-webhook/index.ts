import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID");
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET");
const STRAVA_VERIFY_TOKEN = Deno.env.get("STRAVA_VERIFY_TOKEN") || "SUMMIT_GOALS_STRAVA_WEBHOOK";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface WebhookEvent {
  aspect_type: "create" | "update" | "delete";
  event_time: number;
  object_id: number;
  object_type: "activity" | "athlete";
  owner_id: number;
  subscription_id: number;
  updates?: Record<string, any>;
}

async function refreshTokenIfNeeded(
  adminClient: any,
  connection: any
): Promise<string> {
  const expiresAt = new Date(connection.expires_at);
  const now = new Date();
  
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
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

serve(async (req) => {
  const url = new URL(req.url);

  // GET request = Strava webhook validation
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === STRAVA_VERIFY_TOKEN) {
      console.log("Webhook validation successful");
      return new Response(JSON.stringify({ "hub.challenge": challenge }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Forbidden", { status: 403 });
  }

  // POST request = Webhook event
  if (req.method === "POST") {
    try {
      const event: WebhookEvent = await req.json();
      console.log("Received webhook event:", JSON.stringify(event));

      // Only process activity creation events
      if (event.object_type !== "activity" || event.aspect_type !== "create") {
        return new Response("OK", { status: 200 });
      }

      const adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      // Find user by Strava athlete ID
      const { data: connection, error: connError } = await adminClient
        .from("strava_connections")
        .select("*")
        .eq("strava_athlete_id", event.owner_id)
        .single();

      if (connError || !connection) {
        console.log(`No user found for Strava athlete ${event.owner_id}`);
        return new Response("OK", { status: 200 });
      }

      // Check if activity already synced
      const { data: existingSynced } = await adminClient
        .from("synced_activities")
        .select("id")
        .eq("strava_activity_id", event.object_id)
        .single();

      if (existingSynced) {
        console.log(`Activity ${event.object_id} already synced`);
        return new Response("OK", { status: 200 });
      }

      // Refresh token if needed and fetch activity details
      const accessToken = await refreshTokenIfNeeded(adminClient, connection);

      const activityResponse = await fetch(
        `https://www.strava.com/api/v3/activities/${event.object_id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!activityResponse.ok) {
        console.error(`Failed to fetch activity ${event.object_id}`);
        return new Response("OK", { status: 200 });
      }

      const activity = await activityResponse.json();
      console.log(`Processing activity: ${activity.name} (${activity.sport_type || activity.type})`);

      // Get user's activity mappings
      const { data: mappings } = await adminClient
        .from("activity_mappings")
        .select("*")
        .eq("user_id", connection.user_id);

      // Find matching mapping
      const mapping = mappings?.find(m => 
        m.strava_activity_type === activity.type || 
        m.strava_activity_type === activity.sport_type
      );

      const durationMinutes = Math.round(activity.moving_time / 60);
      const meetsMinDuration = !mapping || durationMinutes >= (mapping.min_duration_minutes || 0);

      // Store synced activity
      await adminClient
        .from("synced_activities")
        .insert({
          user_id: connection.user_id,
          strava_activity_id: activity.id,
          activity_type: activity.sport_type || activity.type,
          activity_name: activity.name,
          start_date: activity.start_date,
          duration_seconds: activity.moving_time,
          distance_meters: activity.distance,
          matched_habit_item_id: mapping && meetsMinDuration ? mapping.habit_item_id : null,
          matched_goal_id: mapping && meetsMinDuration ? mapping.goal_id : null,
          habit_completion_created: false,
        });

      // Create habit completion if we have a match
      if (mapping && meetsMinDuration) {
        const completionDate = activity.start_date_local.split("T")[0];
        
        // Check if completion already exists
        const { data: existingCompletion } = await adminClient
          .from("habit_completions")
          .select("id")
          .eq("user_id", connection.user_id)
          .eq("goal_id", mapping.goal_id)
          .eq("habit_item_id", mapping.habit_item_id)
          .eq("completion_date", completionDate)
          .single();

        if (!existingCompletion) {
          await adminClient
            .from("habit_completions")
            .insert({
              user_id: connection.user_id,
              goal_id: mapping.goal_id,
              habit_item_id: mapping.habit_item_id,
              completion_date: completionDate,
            });

          await adminClient
            .from("synced_activities")
            .update({ habit_completion_created: true })
            .eq("strava_activity_id", activity.id);

          console.log(`Created habit completion for ${activity.name}`);
        }
      }

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response("OK", { status: 200 }); // Always return 200 to Strava
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
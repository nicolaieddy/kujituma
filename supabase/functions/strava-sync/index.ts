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
  
  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log("Refreshing Strava token...");
    
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
    
    // Update stored tokens
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
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

    const adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get user's Strava connection
    const { data: connection, error: connError } = await adminClient
      .from("strava_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (connError || !connection) {
      throw new Error("Strava not connected");
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(adminClient, connection);

    // Get user's activity mappings with goal start dates
    const { data: mappings, error: mappingsError } = await supabase
      .from("activity_mappings")
      .select("*, goals!inner(start_date)")
      .eq("user_id", user.id);

    if (mappingsError) {
      throw new Error(`Failed to fetch mappings: ${mappingsError.message}`);
    }

    console.log(`Found ${mappings?.length || 0} activity mappings`);

    // Find the earliest goal start date from mappings, or default to 30 days ago
    let earliestDate = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    
    if (mappings && mappings.length > 0) {
      for (const mapping of mappings) {
        const goalStartDate = (mapping as any).goals?.start_date;
        if (goalStartDate) {
          const startTimestamp = Math.floor(new Date(goalStartDate).getTime() / 1000);
          if (startTimestamp < earliestDate) {
            earliestDate = startTimestamp;
          }
        }
      }
      console.log(`Looking back to: ${new Date(earliestDate * 1000).toISOString()}`);
    }

    // Fetch activities from the earliest goal start date
    const activitiesResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${earliestDate}&per_page=200`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!activitiesResponse.ok) {
      const errorText = await activitiesResponse.text();
      throw new Error(`Failed to fetch activities: ${errorText}`);
    }

    const activities: StravaActivity[] = await activitiesResponse.json();
    console.log(`Fetched ${activities.length} activities from Strava`);

    // Get already synced activities
    const { data: existingSynced } = await supabase
      .from("synced_activities")
      .select("*")
      .eq("user_id", user.id);

    const syncedMap = new Map((existingSynced || []).map(a => [a.strava_activity_id, a]));

    // Process activities
    const results = {
      synced: 0,
      matched: 0,
      skipped: 0,
      rematched: 0,
    };

    for (const activity of activities) {
      const existingSync = syncedMap.get(activity.id);
      
      // Find matching mapping
      const mapping = mappings?.find(m => 
        m.strava_activity_type === activity.type || 
        m.strava_activity_type === activity.sport_type
      );

      const durationMinutes = Math.round(activity.moving_time / 60);
      const meetsMinDuration = !mapping || durationMinutes >= (mapping.min_duration_minutes || 0);
      const shouldMatch = mapping && meetsMinDuration;

      // If already synced, check if we need to re-match with new mappings
      if (existingSync) {
        // If previously unmatched but now has a matching mapping, update it
        if (!existingSync.matched_habit_item_id && shouldMatch) {
          console.log(`Re-matching activity ${activity.id} (${activity.type}) to habit ${mapping.habit_item_id}`);
          
          // Update the synced activity
          await supabase
            .from("synced_activities")
            .update({
              matched_habit_item_id: mapping.habit_item_id,
              matched_goal_id: mapping.goal_id,
            })
            .eq("id", existingSync.id);

          // Create habit completion
          const completionDate = activity.start_date_local.split("T")[0];
          
          const { data: existingCompletion } = await supabase
            .from("habit_completions")
            .select("id")
            .eq("user_id", user.id)
            .eq("goal_id", mapping.goal_id)
            .eq("habit_item_id", mapping.habit_item_id)
            .eq("completion_date", completionDate)
            .single();

          if (!existingCompletion) {
            const { error: completionError } = await supabase
              .from("habit_completions")
              .insert({
                user_id: user.id,
                goal_id: mapping.goal_id,
                habit_item_id: mapping.habit_item_id,
                completion_date: completionDate,
              });

            if (!completionError) {
              results.rematched++;
              
              await supabase
                .from("synced_activities")
                .update({ habit_completion_created: true })
                .eq("id", existingSync.id);
            }
          } else {
            results.rematched++;
          }
        } else {
          results.skipped++;
        }
        continue;
      }

      // New activity - sync it
      const syncedActivity = {
        user_id: user.id,
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

      const { error: insertError } = await supabase
        .from("synced_activities")
        .insert(syncedActivity);

      if (insertError) {
        console.error(`Failed to insert activity ${activity.id}:`, insertError);
        continue;
      }

      results.synced++;

      // Create habit completion if we have a match
      if (shouldMatch) {
        const completionDate = activity.start_date_local.split("T")[0];
        
        // Check if completion already exists
        const { data: existingCompletion } = await supabase
          .from("habit_completions")
          .select("id")
          .eq("user_id", user.id)
          .eq("goal_id", mapping.goal_id)
          .eq("habit_item_id", mapping.habit_item_id)
          .eq("completion_date", completionDate)
          .single();

        if (!existingCompletion) {
          const { error: completionError } = await supabase
            .from("habit_completions")
            .insert({
              user_id: user.id,
              goal_id: mapping.goal_id,
              habit_item_id: mapping.habit_item_id,
              completion_date: completionDate,
            });

          if (!completionError) {
            results.matched++;
            
            // Update synced activity to mark completion created
            await supabase
              .from("synced_activities")
              .update({ habit_completion_created: true })
              .eq("strava_activity_id", activity.id);
          }
        } else {
          results.matched++; // Already had completion
        }
      }
    }

    console.log("Sync results:", results);

    return new Response(JSON.stringify({ 
      success: true,
      activities: activities.length,
      ...results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Strava sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

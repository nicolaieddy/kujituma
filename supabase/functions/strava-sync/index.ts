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
  average_speed?: number;
  max_speed?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain?: number;
  calories?: number;
  suffer_score?: number;
  average_cadence?: number;
  description?: string;
  workout_type?: number;
}

async function refreshTokenIfNeeded(
  adminClient: any,
  connection: any
): Promise<string> {
  const expiresAt = new Date(connection.expires_at);
  const now = new Date();
  
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

function buildEnrichedFields(activity: StravaActivity) {
  return {
    average_speed: activity.average_speed ?? null,
    max_speed: activity.max_speed ?? null,
    average_heartrate: activity.average_heartrate ?? null,
    max_heartrate: activity.max_heartrate ?? null,
    total_elevation_gain: activity.total_elevation_gain ?? null,
    calories: activity.calories ?? null,
    suffer_score: activity.suffer_score ?? null,
    average_cadence: activity.average_cadence ?? null,
    elapsed_time_seconds: activity.elapsed_time ?? null,
    sport_type: activity.sport_type ?? null,
    strava_description: activity.description ?? null,
    workout_type_id: activity.workout_type ?? null,
  };
}

// Get Monday YYYY-MM-DD from a date string
function getMondayOfDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().split("T")[0];
}

// Get day_of_week (0=Mon, 6=Sun) from a local date string like "2026-04-07"
function getDayOfWeek(localDateStr: string): number {
  const d = new Date(localDateStr + "T12:00:00");
  const jsDay = d.getDay(); // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1; // convert to 0=Mon
}

async function autoMatchTrainingPlan(
  supabase: any,
  userId: string,
  weekStarts: Set<string>
) {
  if (weekStarts.size === 0) return 0;
  let matched = 0;

  for (const weekStart of weekStarts) {
    // Get unmatched training plan workouts for this week
    const { data: planWorkouts } = await supabase
      .from("training_plan_workouts")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .is("matched_strava_activity_id", null);

    if (!planWorkouts || planWorkouts.length === 0) continue;

    // Get synced activities for this week
    const weekEnd = new Date(weekStart + "T00:00:00");
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const { data: activities } = await supabase
      .from("synced_activities")
      .select("*")
      .eq("user_id", userId)
      .gte("start_date", `${weekStart}T00:00:00Z`)
      .lte("start_date", `${weekEndStr}T23:59:59Z`);

    if (!activities || activities.length === 0) continue;

    // Try to match each plan workout to an activity
    const usedActivityIds = new Set<number>();

    for (const workout of planWorkouts) {
      const match = activities.find((a: any) => {
        if (usedActivityIds.has(a.strava_activity_id)) return false;
        // start_date from DB can be "2026-04-06 21:23:26+00" or ISO with "T"
        const actLocalDate = (a.start_date || "").replace(" ", "T").split("T")[0];
        const actDow = getDayOfWeek(actLocalDate);
        const typeMatch = (a.activity_type || "").toLowerCase() === (workout.workout_type || "").toLowerCase() ||
                          (a.sport_type || "").toLowerCase() === (workout.workout_type || "").toLowerCase();
        return actDow === workout.day_of_week && typeMatch;
      });

      if (match) {
        await supabase
          .from("training_plan_workouts")
          .update({ matched_strava_activity_id: match.strava_activity_id })
          .eq("id", workout.id);
        usedActivityIds.add(match.strava_activity_id);
        matched++;
      }
    }
  }

  return matched;
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

    // Fetch activities from Strava
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

    const syncedMap = new Map((existingSynced || []).map((a: any) => [a.strava_activity_id, a]));

    const results = {
      synced: 0,
      matched: 0,
      skipped: 0,
      rematched: 0,
      training_matched: 0,
    };

    // Track which weeks have new activities for training plan matching
    const affectedWeeks = new Set<string>();

    for (const activity of activities) {
      const existingSync = syncedMap.get(activity.id);
      
      const mapping = mappings?.find((m: any) => 
        m.strava_activity_type === activity.type || 
        m.strava_activity_type === activity.sport_type
      );

      const durationMinutes = Math.round(activity.moving_time / 60);
      const meetsMinDuration = !mapping || durationMinutes >= (mapping.min_duration_minutes || 0);
      const shouldMatch = mapping && meetsMinDuration;

      const enrichedFields = buildEnrichedFields(activity);
      const activityLocalDate = activity.start_date_local.split("T")[0];
      const weekMonday = getMondayOfDate(activity.start_date_local);
      affectedWeeks.add(weekMonday);

      if (existingSync) {
        // Update enriched fields on existing synced activities
        const needsEnrichment = !existingSync.average_speed && activity.average_speed;
        
        if (needsEnrichment) {
          await supabase
            .from("synced_activities")
            .update(enrichedFields)
            .eq("id", existingSync.id);
        }

        if (!existingSync.matched_habit_item_id && shouldMatch) {
          console.log(`Re-matching activity ${activity.id} (${activity.type}) to habit ${mapping.habit_item_id}`);
          
          await supabase
            .from("synced_activities")
            .update({
              matched_habit_item_id: mapping.habit_item_id,
              matched_goal_id: mapping.goal_id,
              ...enrichedFields,
            })
            .eq("id", existingSync.id);

          const completionDate = activityLocalDate;
          
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

      // New activity - sync it with enriched data
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
        ...enrichedFields,
      };

      const { error: insertError } = await supabase
        .from("synced_activities")
        .insert(syncedActivity);

      if (insertError) {
        console.error(`Failed to insert activity ${activity.id}:`, insertError);
        continue;
      }

      results.synced++;

      if (shouldMatch) {
        const completionDate = activityLocalDate;
        
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
            await supabase
              .from("synced_activities")
              .update({ habit_completion_created: true })
              .eq("strava_activity_id", activity.id);
          }
        } else {
          results.matched++;
        }
      }
    }

    // Auto-match training plan workouts
    results.training_matched = await autoMatchTrainingPlan(supabase, user.id, affectedWeeks);
    if (results.training_matched > 0) {
      console.log(`Auto-matched ${results.training_matched} training plan workouts`);
    }

    // Update last_synced_at timestamp
    await adminClient
      .from("strava_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", user.id);

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

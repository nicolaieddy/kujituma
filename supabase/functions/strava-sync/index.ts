import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { autoMatchTrainingPlan, getDayOfWeek } from "../_shared/auto-match-plan.ts";
import { SyncRunLogger, type RunStatus } from "../_shared/sync-logger.ts";

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
  timezone?: string;
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

/** Strava returns timezone like "(GMT-08:00) America/Los_Angeles" — extract IANA name. */
function parseStravaTz(tz?: string | null): string | null {
  if (!tz) return null;
  const m = tz.match(/\)\s*(.+)$/);
  const iana = (m ? m[1] : tz).trim();
  return /^[A-Za-z_]+\/[A-Za-z_\/\-]+$/.test(iana) ? iana : null;
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

// Get Monday YYYY-MM-DD from a date string
function getMondayOfDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().split("T")[0];
}

// auto-match logic + getDayOfWeek moved to ../_shared/auto-match-plan.ts

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let logger: SyncRunLogger | null = null;
  let adminClient: any = null;

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    // Optional body: { trigger: "manual" | "scheduled" | "webhook" }
    let trigger: "manual" | "scheduled" | "webhook" = "manual";
    try {
      if (req.headers.get("content-type")?.includes("application/json")) {
        const body = await req.json();
        if (body?.trigger) trigger = body.trigger;
      }
    } catch { /* ignore */ }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    logger = new SyncRunLogger(adminClient, user.id, "strava", trigger);

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

    // Fetch user's timezone for correct local date derivation
    const { data: userProfile } = await adminClient
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .single();
    const userTimezone = userProfile?.timezone || "UTC";

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
      // Prefer the activity's own timezone (from Strava); fall back to profile tz.
      const activityTz = parseStravaTz(activity.timezone) || userTimezone;
      const activityLocalDate = getLocalDate(activity.start_date, activityTz);
      const weekMonday = getMondayOfDate(activityLocalDate + "T12:00:00");
      affectedWeeks.add(weekMonday);

      if (existingSync) {
        // Update enriched fields and backfill activity_date on existing synced activities
        const needsEnrichment = !existingSync.average_speed && activity.average_speed;
        const needsDateFix = !existingSync.activity_date || existingSync.activity_date !== activityLocalDate;
        const needsTzFix = !existingSync.timezone || existingSync.timezone !== activityTz;
        
        if (needsEnrichment || needsDateFix || needsTzFix) {
          await supabase
            .from("synced_activities")
            .update({
              ...enrichedFields,
              activity_date: activityLocalDate,
              timezone: activityTz,
            })
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

      // Check for FIT upload duplicate: same start_date and similar distance (within 1%)
      const { data: fitDuplicate } = await supabase
        .from("synced_activities")
        .select("id")
        .eq("user_id", user.id)
        .is("strava_activity_id", null)
        .eq("start_date", activity.start_date)
        .single();

      if (fitDuplicate && activity.distance > 0) {
        console.log(`Skipping Strava activity ${activity.id} — FIT upload duplicate exists (${fitDuplicate.id})`);
        results.skipped++;
        continue;
      }

      // New activity - sync it with enriched data
      const syncedActivity = {
        user_id: user.id,
        strava_activity_id: activity.id,
        activity_type: activity.sport_type || activity.type,
        activity_name: activity.name,
        start_date: activity.start_date,
        activity_date: activityLocalDate,
        timezone: activityTz,
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

    // Auto-match training plan workouts — include all weeks with synced activities
    // Gather weeks from ALL synced activities (not just newly fetched)
    const { data: allSyncedDates } = await supabase
      .from("synced_activities")
      .select("start_date")
      .eq("user_id", user.id);
    if (allSyncedDates) {
      for (const row of allSyncedDates) {
        const dateStr = (row.start_date || "").replace(" ", "T");
        if (dateStr) affectedWeeks.add(getMondayOfDate(dateStr));
      }
    }

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

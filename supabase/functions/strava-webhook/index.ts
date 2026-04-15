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

      // Get user's timezone for correct local date
      const { data: userProfile } = await adminClient
        .from("profiles")
        .select("timezone")
        .eq("id", connection.user_id)
        .single();
      const userTimezone = userProfile?.timezone || "UTC";

      // Derive local date
      function getLocalDateWh(utcIso: string, tz: string): string {
        const d = new Date(utcIso);
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
        }).formatToParts(d);
        const y = parts.find(p => p.type === "year")!.value;
        const m = parts.find(p => p.type === "month")!.value;
        const dd = parts.find(p => p.type === "day")!.value;
        return `${y}-${m}-${dd}`;
      }
      const activityLocalDate = getLocalDateWh(activity.start_date, userTimezone);

      // Get user's activity mappings
      const { data: mappings } = await adminClient
        .from("activity_mappings")
        .select("*")
        .eq("user_id", connection.user_id);

      const mapping = mappings?.find(m => 
        m.strava_activity_type === activity.type || 
        m.strava_activity_type === activity.sport_type
      );

      const durationMinutes = Math.round(activity.moving_time / 60);
      const meetsMinDuration = !mapping || durationMinutes >= (mapping.min_duration_minutes || 0);

      // Store synced activity
      const { data: syncedRow } = await adminClient
        .from("synced_activities")
        .insert({
          user_id: connection.user_id,
          strava_activity_id: activity.id,
          activity_type: activity.sport_type || activity.type,
          activity_name: activity.name,
          start_date: activity.start_date,
          activity_date: activityLocalDate,
          duration_seconds: activity.moving_time,
          distance_meters: activity.distance,
          matched_habit_item_id: mapping && meetsMinDuration ? mapping.habit_item_id : null,
          matched_goal_id: mapping && meetsMinDuration ? mapping.goal_id : null,
          habit_completion_created: false,
        })
        .select("id")
        .single();

      // Create habit completion if we have a match
      if (mapping && meetsMinDuration) {
        const completionDate = activityLocalDate;
        
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

      // Auto-match training plan
      if (syncedRow?.id) {
        const actType = (activity.sport_type || activity.type || "").toLowerCase();
        // Get Monday of the activity's local date
        function getMondayWh(dateStr: string): string {
          const d = new Date(dateStr + "T12:00:00");
          const day = d.getDay();
          d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        }
        function getDayOfWeekWh(localDateStr: string): number {
          const d = new Date(localDateStr + "T12:00:00");
          const jsDay = d.getDay();
          return jsDay === 0 ? 6 : jsDay - 1;
        }
        const weekStart = getMondayWh(activityLocalDate);
        const actDow = getDayOfWeekWh(activityLocalDate);

        // Try to match unmatched workout
        const { data: unmatchedWorkouts } = await adminClient
          .from("training_plan_workouts")
          .select("id, workout_type, day_of_week")
          .eq("user_id", connection.user_id)
          .eq("week_start", weekStart)
          .eq("day_of_week", actDow)
          .is("matched_strava_activity_id", null);

        let trainingMatched = false;
        for (const workout of (unmatchedWorkouts || [])) {
          const planType = (workout.workout_type || "").toLowerCase();
          if (planType === "rest") continue;
          const typeMatch = actType === planType || planType === "workout" ||
            (actType === "run" && planType === "run") ||
            (actType === "weighttraining" && (planType === "strength" || planType === "workout"));
          if (!typeMatch) continue;

          await adminClient
            .from("training_plan_workouts")
            .update({ matched_strava_activity_id: activity.id })
            .eq("id", workout.id);
          await adminClient
            .from("training_workout_activities")
            .upsert(
              { workout_id: workout.id, activity_id: syncedRow.id, session_order: 0 },
              { onConflict: "workout_id,activity_id" }
            );
          console.log(`Webhook: matched workout ${workout.id} to Strava activity ${activity.id}`);
          trainingMatched = true;
          break;
        }

        // If no unmatched workout, try multi-session grouping
        if (!trainingMatched) {
          const { data: matchedWorkouts } = await adminClient
            .from("training_plan_workouts")
            .select("id, workout_type, day_of_week")
            .eq("user_id", connection.user_id)
            .eq("week_start", weekStart)
            .eq("day_of_week", actDow)
            .not("matched_strava_activity_id", "is", null);

          for (const workout of (matchedWorkouts || [])) {
            const planType = (workout.workout_type || "").toLowerCase();
            const typeMatch = actType === planType || planType === "workout" ||
              (actType === "run" && planType === "run");
            if (!typeMatch) continue;

            const { data: existingLinks } = await adminClient
              .from("training_workout_activities")
              .select("activity_id, session_order")
              .eq("workout_id", workout.id)
              .order("session_order", { ascending: false });

            if (!existingLinks || existingLinks.length === 0) continue;

            const { data: lastAct } = await adminClient
              .from("synced_activities")
              .select("start_date, duration_seconds")
              .eq("id", existingLinks[0].activity_id)
              .single();

            if (!lastAct) continue;

            const prevEnd = new Date(lastAct.start_date).getTime() + (lastAct.duration_seconds || 0) * 1000;
            const newStart = new Date(activity.start_date).getTime();
            if (Math.abs(newStart - prevEnd) <= 2 * 60 * 60 * 1000) {
              const nextOrder = (existingLinks[0].session_order ?? 0) + 1;
              await adminClient
                .from("training_workout_activities")
                .upsert(
                  { workout_id: workout.id, activity_id: syncedRow.id, session_order: nextOrder },
                  { onConflict: "workout_id,activity_id" }
                );
              console.log(`Webhook multi-session: added activity as session ${nextOrder} to workout ${workout.id}`);
              trainingMatched = true;
              break;
            }
          }
        }

        // If still no match, create unplanned workout
        if (!trainingMatched) {
          const { data: newWorkout } = await adminClient
            .from("training_plan_workouts")
            .insert({
              user_id: connection.user_id,
              week_start: weekStart,
              day_of_week: actDow,
              workout_type: activity.sport_type || activity.type || "Workout",
              title: activity.name || "Strava Activity",
              description: "",
              notes: "Auto-created from Strava webhook",
              order_index: 0,
              matched_strava_activity_id: activity.id,
            })
            .select("id")
            .single();

          if (newWorkout) {
            await adminClient
              .from("training_workout_activities")
              .upsert(
                { workout_id: newWorkout.id, activity_id: syncedRow.id, session_order: 0 },
                { onConflict: "workout_id,activity_id" }
              );
            console.log(`Webhook: created unplanned workout for Strava activity ${activity.id}`);
          }
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
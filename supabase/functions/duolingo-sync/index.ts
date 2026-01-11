import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DuolingoUser {
  username: string;
  name?: string;
  streak: number;
  totalXp: number;
  courses?: Array<{
    title: string;
    xp: number;
  }>;
}

// Fetch user data from Duolingo's unofficial API
async function fetchDuolingoUser(username: string): Promise<DuolingoUser | null> {
  try {
    const response = await fetch(
      `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(username)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; HabitTracker/1.0)",
        },
      }
    );

    if (!response.ok) {
      console.error(`Duolingo API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.users || data.users.length === 0) {
      return null;
    }

    const user = data.users[0];
    
    return {
      username: user.username,
      name: user.name || user.username,
      streak: user.streak || 0,
      totalXp: user.totalXp || 0,
      courses: user.courses || [],
    };
  } catch (error) {
    console.error("Error fetching Duolingo user:", error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, username } = await req.json();

    // Action: connect - validate username and store connection
    if (action === "connect") {
      if (!username || typeof username !== "string") {
        return new Response(
          JSON.stringify({ error: "Username is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const duolingoUser = await fetchDuolingoUser(username.trim());
      
      if (!duolingoUser) {
        return new Response(
          JSON.stringify({ 
            error: "User not found", 
            message: "Could not find that Duolingo username. Make sure the profile is public." 
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Upsert the connection
      const { data: connection, error: insertError } = await supabase
        .from("duolingo_connections")
        .upsert({
          user_id: user.id,
          duolingo_username: duolingoUser.username,
          display_name: duolingoUser.name,
          current_streak: duolingoUser.streak,
          total_xp: duolingoUser.totalXp,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        .select()
        .single();

      if (insertError) {
        console.error("Error saving connection:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to save connection" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          connection,
          duolingoUser 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: disconnect - remove connection
    if (action === "disconnect") {
      const { error: deleteError } = await supabase
        .from("duolingo_connections")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("Error deleting connection:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to disconnect" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: sync - fetch latest data and check for habit completions
    if (action === "sync") {
      // Get existing connection
      const { data: connection, error: connError } = await supabase
        .from("duolingo_connections")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (connError || !connection) {
        return new Response(
          JSON.stringify({ error: "No Duolingo connection found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const duolingoUser = await fetchDuolingoUser(connection.duolingo_username);
      
      if (!duolingoUser) {
        return new Response(
          JSON.stringify({ 
            error: "Could not fetch Duolingo data",
            message: "The Duolingo API may be temporarily unavailable. Please try again later."
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const previousStreak = connection.current_streak;
      const currentStreak = duolingoUser.streak;
      const streakMaintained = currentStreak >= previousStreak && currentStreak > 0;

      // Update connection with latest data
      const { error: updateError } = await supabase
        .from("duolingo_connections")
        .update({
          current_streak: currentStreak,
          total_xp: duolingoUser.totalXp,
          display_name: duolingoUser.name,
          last_synced_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Error updating connection:", updateError);
      }

      // If streak is maintained, check for habits to auto-complete
      let habitsCompleted = 0;
      
      if (streakMaintained) {
        // Get Duolingo activity mappings
        const { data: mappings } = await supabase
          .from("activity_mappings")
          .select("*")
          .eq("user_id", user.id)
          .eq("integration_type", "duolingo");

        if (mappings && mappings.length > 0) {
          const today = new Date().toISOString().split("T")[0];
          
          for (const mapping of mappings) {
            // Check if already completed today
            const { data: existing } = await supabase
              .from("habit_completions")
              .select("id")
              .eq("user_id", user.id)
              .eq("goal_id", mapping.goal_id)
              .eq("habit_item_id", mapping.habit_item_id)
              .eq("completed_date", today)
              .single();

            if (!existing) {
              // Create habit completion
              const { error: completeError } = await supabase
                .from("habit_completions")
                .insert({
                  user_id: user.id,
                  goal_id: mapping.goal_id,
                  habit_item_id: mapping.habit_item_id,
                  completed_date: today,
                  synced_from: "duolingo",
                });

              if (!completeError) {
                habitsCompleted++;
              }
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          streak: currentStreak,
          totalXp: duolingoUser.totalXp,
          streakMaintained,
          habitsCompleted,
          previousStreak,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: status - check connection status
    if (action === "status") {
      const { data: connection } = await supabase
        .from("duolingo_connections")
        .select("*")
        .eq("user_id", user.id)
        .single();

      return new Response(
        JSON.stringify({ 
          connected: !!connection,
          connection 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Duolingo sync error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

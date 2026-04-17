import { getMondayOfWeek, getWeekEnd, toDateStr } from "./helpers.ts";
import type { createClient } from "npm:@supabase/supabase-js@2";

type Supabase = ReturnType<typeof createClient>;
type McpServer = any;

export function registerReadTools(mcp: McpServer, supabase: Supabase, userId: string) {
  mcp.tool("get_active_goals", {
    description: "Get all active goals for the authenticated user. Optionally filter by timeframe.",
    inputSchema: {
      type: "object",
      properties: {
        timeframe: { type: "string", description: "Filter: 'yearly', 'quarterly', 'monthly'" },
      },
    },
    handler: async ({ timeframe }: { timeframe?: string }) => {
      let query = supabase
        .from("goals")
        .select("id, title, description, category, timeframe, status, start_date, target_date, habit_items, is_recurring, recurrence_frequency, visibility")
        .eq("user_id", userId)
        .not("status", "in", '("completed","deprioritized")')
        .eq("is_paused", false)
        .order("order_index", { ascending: true });
      if (timeframe) query = query.eq("timeframe", timeframe);
      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  });

  mcp.tool("get_weekly_objectives", {
    description: "Get weekly objectives for a given week (Monday-based). Defaults to current week.",
    inputSchema: {
      type: "object",
      properties: {
        week_start: { type: "string", description: "YYYY-MM-DD Monday. Defaults to current week." },
      },
    },
    handler: async ({ week_start }: { week_start?: string }) => {
      const weekKey = week_start || getMondayOfWeek(new Date());
      const { data, error } = await supabase
        .from("weekly_objectives")
        .select("id, text, is_completed, goal_id, order_index, scheduled_day, scheduled_time")
        .eq("user_id", userId)
        .eq("week_start", weekKey)
        .order("order_index", { ascending: true });
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      const completed = data?.filter((o: any) => o.is_completed).length || 0;
      return {
        content: [{ type: "text" as const, text: `Week ${weekKey}: ${completed}/${data?.length || 0} completed\n\n${JSON.stringify(data, null, 2)}` }],
      };
    },
  });

  mcp.tool("get_streaks", {
    description: "Get daily, weekly, and quarterly streaks",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const { data, error } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data) return { content: [{ type: "text" as const, text: "No streak data yet." }] };
      return {
        content: [{
          type: "text" as const,
          text: [
            `Daily: ${data.current_daily_streak} (best: ${data.longest_daily_streak})`,
            `Weekly: ${data.current_weekly_streak} (best: ${data.longest_weekly_streak})`,
            `Quarterly: ${data.current_quarterly_streak} (best: ${data.longest_quarterly_streak})`,
            `Last check-in: ${data.last_check_in_date || "never"}`,
          ].join("\n"),
        }],
      };
    },
  });

  mcp.tool("get_habit_completions", {
    description: "Get habit completions for a given week",
    inputSchema: {
      type: "object",
      properties: {
        week_start: { type: "string", description: "YYYY-MM-DD Monday. Defaults to current week." },
      },
    },
    handler: async ({ week_start }: { week_start?: string }) => {
      const weekKey = week_start || getMondayOfWeek(new Date());
      const weekEnd = getWeekEnd(weekKey);
      const { data, error } = await supabase
        .from("habit_completions")
        .select("id, goal_id, habit_item_id, completion_date")
        .eq("user_id", userId)
        .gte("completion_date", weekKey)
        .lte("completion_date", weekEnd)
        .order("completion_date");
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return {
        content: [{ type: "text" as const, text: `${data?.length || 0} completions for week ${weekKey}\n\n${JSON.stringify(data, null, 2)}` }],
      };
    },
  });

  mcp.tool("get_analytics_summary", {
    description: "Productivity analytics: objectives, check-ins, habits, goals over a date range",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "YYYY-MM-DD. Defaults to 30 days ago." },
        end_date: { type: "string", description: "YYYY-MM-DD. Defaults to today." },
      },
    },
    handler: async ({ start_date, end_date }: { start_date?: string; end_date?: string }) => {
      const endD = end_date || toDateStr(new Date());
      const startD = start_date || toDateStr(new Date(Date.now() - 30 * 86400000));

      const [objRes, ciRes, habRes, goalRes] = await Promise.all([
        supabase.from("weekly_objectives").select("id, is_completed").eq("user_id", userId).gte("week_start", startD).lte("week_start", endD),
        supabase.from("daily_check_ins").select("id, mood_rating, energy_level").eq("user_id", userId).gte("check_in_date", startD).lte("check_in_date", endD),
        supabase.from("habit_completions").select("id").eq("user_id", userId).gte("completion_date", startD).lte("completion_date", endD),
        supabase.from("goals").select("id, title, status, category").eq("user_id", userId).not("status", "eq", "deprioritized"),
      ]);

      const obj = objRes.data || [];
      const ci = ciRes.data || [];
      const goals = goalRes.data || [];
      const done = obj.filter((o: any) => o.is_completed).length;
      const moodVals = ci.filter((c: any) => c.mood_rating).map((c: any) => c.mood_rating);
      const avgMood = moodVals.length ? (moodVals.reduce((a: number, b: number) => a + b, 0) / moodVals.length).toFixed(1) : "N/A";

      const cats: Record<string, number> = {};
      goals.forEach((g: any) => {
        cats[g.category || "Uncategorized"] = (cats[g.category || "Uncategorized"] || 0) + 1;
      });

      return {
        content: [{
          type: "text" as const,
          text: [
            `📊 ${startD} → ${endD}`,
            `Objectives: ${done}/${obj.length} (${obj.length ? Math.round((done / obj.length) * 100) : 0}%)`,
            `Check-ins: ${ci.length} | Habit completions: ${habRes.data?.length || 0}`,
            `Avg mood: ${avgMood}/5`,
            `Goals: ${goals.filter((g: any) => g.status === "in_progress").length} active, ${goals.filter((g: any) => g.status === "completed").length} done`,
            `Categories: ${Object.entries(cats).map(([c, n]) => `${c}(${n})`).join(", ")}`,
          ].join("\n"),
        }],
      };
    },
  });

  mcp.tool("get_partnerships", {
    description: "List active accountability partnerships with partner names",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const { data, error } = await supabase
        .from("accountability_partnerships")
        .select("id, user1_id, user2_id, last_check_in_at")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq("status", "active");
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data?.length) return { content: [{ type: "text" as const, text: "No active partnerships." }] };

      const partnerIds = data.map((p: any) => (p.user1_id === userId ? p.user2_id : p.user1_id));
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", partnerIds);
      const pMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);

      const lines = data.map((p: any) => {
        const pid = p.user1_id === userId ? p.user2_id : p.user1_id;
        return `• ${pMap.get(pid) || "Unknown"} (partnership: ${p.id}) — last: ${p.last_check_in_at || "never"}`;
      });
      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    },
  });

  mcp.tool("get_goal_details", {
    description: "Get a single goal with its linked weekly objectives and habit items",
    inputSchema: {
      type: "object",
      properties: {
        goal_id: { type: "string", description: "Goal ID" },
      },
      required: ["goal_id"],
    },
    handler: async ({ goal_id }: { goal_id: string }) => {
      const [goalRes, objRes] = await Promise.all([
        supabase.from("goals").select("*").eq("id", goal_id).eq("user_id", userId).single(),
        supabase.from("weekly_objectives").select("id, text, is_completed, week_start, scheduled_day").eq("user_id", userId).eq("goal_id", goal_id).order("week_start", { ascending: false }).limit(20),
      ]);
      if (goalRes.error) return { content: [{ type: "text" as const, text: `Error: ${goalRes.error.message}` }] };
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ goal: goalRes.data, recent_objectives: objRes.data || [] }, null, 2) }],
      };
    },
  });

  mcp.tool("search_goals", {
    description: "Search across goal titles and descriptions",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search text" },
      },
      required: ["query"],
    },
    handler: async ({ query }: { query: string }) => {
      const { data, error } = await supabase
        .from("goals")
        .select("id, title, description, category, timeframe, status")
        .eq("user_id", userId)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(20);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `${data?.length || 0} results:\n\n${JSON.stringify(data, null, 2)}` }] };
    },
  });

  mcp.tool("get_daily_check_ins", {
    description: "Fetch daily check-in history for a date range (mood, energy, journal entries)",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "YYYY-MM-DD. Defaults to 7 days ago." },
        end_date: { type: "string", description: "YYYY-MM-DD. Defaults to today." },
      },
    },
    handler: async ({ start_date, end_date }: { start_date?: string; end_date?: string }) => {
      const endD = end_date || toDateStr(new Date());
      const startD = start_date || toDateStr(new Date(Date.now() - 7 * 86400000));
      const { data, error } = await supabase
        .from("daily_check_ins")
        .select("id, check_in_date, mood_rating, energy_level, focus_today, quick_win, blocker, journal_entry")
        .eq("user_id", userId)
        .gte("check_in_date", startD)
        .lte("check_in_date", endD)
        .order("check_in_date", { ascending: false });
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `${data?.length || 0} check-ins (${startD} → ${endD}):\n\n${JSON.stringify(data, null, 2)}` }] };
    },
  });

  mcp.tool("get_weekly_planning", {
    description: "Get weekly planning sessions (intention, reflection) for current or past weeks",
    inputSchema: {
      type: "object",
      properties: {
        week_start: { type: "string", description: "YYYY-MM-DD Monday. Defaults to current week." },
      },
    },
    handler: async ({ week_start }: { week_start?: string }) => {
      const weekKey = week_start || getMondayOfWeek(new Date());
      const { data, error } = await supabase
        .from("weekly_planning_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("week_start", weekKey)
        .maybeSingle();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data) return { content: [{ type: "text" as const, text: `No planning session for week ${weekKey}.` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  });

  mcp.tool("get_friends", {
    description: "List friends with profile info",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const { data, error } = await supabase
        .from("friends")
        .select("id, user1_id, user2_id")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data?.length) return { content: [{ type: "text" as const, text: "No friends yet." }] };

      const friendIds = data.map((f: any) => (f.user1_id === userId ? f.user2_id : f.user1_id));
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, last_active_at").in("id", friendIds);
      const lines = (profiles || []).map((p: any) => `• ${p.full_name} (last active: ${p.last_active_at || "unknown"})`);
      return { content: [{ type: "text" as const, text: `${lines.length} friends:\n${lines.join("\n")}` }] };
    },
  });

  mcp.tool("get_activity_reflection", {
    description: "Get the per-workout reflection text for a specific synced activity. Accepts either a database UUID or a Strava activity ID.",
    inputSchema: {
      type: "object",
      properties: {
        activity_id: { type: "string", description: "Database UUID of the activity" },
        strava_activity_id: { type: "number", description: "Strava activity ID (alternative lookup)" },
      },
    },
    handler: async ({ activity_id, strava_activity_id }: { activity_id?: string; strava_activity_id?: number }) => {
      if (!activity_id && !strava_activity_id) {
        return { content: [{ type: "text" as const, text: "Provide either activity_id or strava_activity_id" }] };
      }
      let query = supabase
        .from("synced_activities")
        .select("id, activity_name, start_date, reflection, reflection_updated_at")
        .eq("user_id", userId);
      if (activity_id) query = query.eq("id", activity_id);
      else query = query.eq("strava_activity_id", strava_activity_id!);

      const { data, error } = await query.maybeSingle();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data) return { content: [{ type: "text" as const, text: "Activity not found." }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  });

  mcp.tool("get_week_summary", {
    description: "Combined snapshot for a week: objectives completion %, habits done, check-in status, planning status",
    inputSchema: {
      type: "object",
      properties: {
        week_start: { type: "string", description: "YYYY-MM-DD Monday. Defaults to current week." },
      },
    },
    handler: async ({ week_start }: { week_start?: string }) => {
      const weekKey = week_start || getMondayOfWeek(new Date());
      const weekEnd = getWeekEnd(weekKey);

      const [objRes, habRes, ciRes, planRes] = await Promise.all([
        supabase.from("weekly_objectives").select("id, is_completed").eq("user_id", userId).eq("week_start", weekKey),
        supabase.from("habit_completions").select("id").eq("user_id", userId).gte("completion_date", weekKey).lte("completion_date", weekEnd),
        supabase.from("daily_check_ins").select("id, check_in_date").eq("user_id", userId).gte("check_in_date", weekKey).lte("check_in_date", weekEnd),
        supabase.from("weekly_planning_sessions").select("id, is_completed, week_intention").eq("user_id", userId).eq("week_start", weekKey).maybeSingle(),
      ]);

      const objs = objRes.data || [];
      const done = objs.filter((o: any) => o.is_completed).length;
      const pct = objs.length ? Math.round((done / objs.length) * 100) : 0;

      return {
        content: [{
          type: "text" as const,
          text: [
            `📅 Week of ${weekKey}`,
            `Objectives: ${done}/${objs.length} (${pct}%)`,
            `Habit completions: ${habRes.data?.length || 0}`,
            `Check-ins: ${ciRes.data?.length || 0}/7 days`,
            `Planning: ${planRes.data ? (planRes.data.is_completed ? "✅ completed" : "⏳ in progress") : "❌ not started"}`,
            planRes.data?.week_intention ? `Intention: "${planRes.data.week_intention}"` : "",
          ].filter(Boolean).join("\n"),
        }],
      };
    },
  });
}

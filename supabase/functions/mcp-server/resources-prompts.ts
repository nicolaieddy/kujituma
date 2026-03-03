import { getMondayOfWeek, getWeekEnd, toDateStr } from "./helpers.ts";
import type { createClient } from "npm:@supabase/supabase-js@2";

type Supabase = ReturnType<typeof createClient>;
type McpServer = any;

export function registerResources(mcp: McpServer, supabase: Supabase, userId: string) {
  mcp.resource({
    uri: "user://profile",
    name: "User Profile",
    description: "User's name, streak data, and goal count",
    mimeType: "application/json",
    handler: async () => {
      const [profileRes, streakRes, goalRes] = await Promise.all([
        supabase.from("profiles").select("full_name, email, last_active_at").eq("id", userId).single(),
        supabase.from("user_streaks").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("goals").select("id, status").eq("user_id", userId).not("status", "eq", "deprioritized"),
      ]);
      const goals = goalRes.data || [];
      const profile = {
        name: profileRes.data?.full_name || "Unknown",
        email: profileRes.data?.email || "",
        streaks: streakRes.data ? {
          daily: streakRes.data.current_daily_streak,
          weekly: streakRes.data.current_weekly_streak,
          quarterly: streakRes.data.current_quarterly_streak,
          last_check_in: streakRes.data.last_check_in_date,
        } : null,
        goals: {
          active: goals.filter((g: any) => g.status === "in_progress").length,
          completed: goals.filter((g: any) => g.status === "completed").length,
          total: goals.length,
        },
      };
      return { text: JSON.stringify(profile, null, 2) };
    },
  });

  mcp.resource({
    uri: "week://current",
    name: "Current Week",
    description: "This week's objectives and completion status",
    mimeType: "application/json",
    handler: async () => {
      const weekKey = getMondayOfWeek(new Date());
      const weekEnd = getWeekEnd(weekKey);
      const [objRes, habRes, ciRes] = await Promise.all([
        supabase.from("weekly_objectives").select("id, text, is_completed, goal_id, scheduled_day").eq("user_id", userId).eq("week_start", weekKey).order("order_index"),
        supabase.from("habit_completions").select("id").eq("user_id", userId).gte("completion_date", weekKey).lte("completion_date", weekEnd),
        supabase.from("daily_check_ins").select("check_in_date").eq("user_id", userId).gte("check_in_date", weekKey).lte("check_in_date", weekEnd),
      ]);
      const objs = objRes.data || [];
      const done = objs.filter((o: any) => o.is_completed).length;
      return {
        text: JSON.stringify({
          week_start: weekKey,
          objectives: objs,
          completion: `${done}/${objs.length}`,
          habit_completions: habRes.data?.length || 0,
          check_in_days: (ciRes.data || []).map((c: any) => c.check_in_date),
        }, null, 2),
      };
    },
  });

  mcp.resource({
    uri: "goals://active",
    name: "Active Goals",
    description: "All active (non-paused, non-completed) goals",
    mimeType: "application/json",
    handler: async () => {
      const { data } = await supabase
        .from("goals")
        .select("id, title, description, category, timeframe, status, start_date, target_date, habit_items")
        .eq("user_id", userId)
        .not("status", "in", '("completed","deprioritized")')
        .eq("is_paused", false)
        .order("order_index");
      return { text: JSON.stringify(data || [], null, 2) };
    },
  });
}

export function registerPrompts(mcp: McpServer) {
  mcp.prompt({
    name: "weekly_review",
    description: "Review this week's progress — objectives, habits, check-ins — and get Claude's analysis",
    handler: () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: "Please review my week. Use get_week_summary for this week, then get_weekly_objectives for details. Analyze what went well, what didn't, and suggest focus areas for next week. Be specific and actionable.",
        },
      }],
    }),
  });

  mcp.prompt({
    name: "plan_my_week",
    description: "Plan next week based on active goals, last week's incomplete objectives, and current momentum",
    handler: () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: "Help me plan my week. First check my active goals with get_active_goals, then look at last week's objectives with get_weekly_objectives to see what's incomplete. Suggest 5-7 concrete objectives for this week, prioritized by impact. Ask me which ones to create.",
        },
      }],
    }),
  });

  mcp.prompt({
    name: "daily_check_in",
    description: "Guided daily check-in — mood, energy, focus, blockers, and journal entry",
    handler: () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: "Let's do my daily check-in. Ask me about my mood (1-5), energy (1-5), what I want to focus on today, any quick wins, and any blockers. Then log it with log_daily_check_in. Keep it conversational and brief.",
        },
      }],
    }),
  });
}

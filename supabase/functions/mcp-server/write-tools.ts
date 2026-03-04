import { getMondayOfWeek, toDateStr } from "./helpers.ts";
import type { createClient } from "npm:@supabase/supabase-js@2";

type Supabase = ReturnType<typeof createClient>;
type McpServer = any;

export function registerWriteTools(mcp: McpServer, supabase: Supabase, userId: string) {
  mcp.tool("create_objective", {
    description: "Create a weekly objective for the current or specified week",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Objective text" },
        goal_id: { type: "string", description: "Optional goal ID to link to" },
        week_start: { type: "string", description: "YYYY-MM-DD Monday. Defaults to current week." },
        scheduled_day: { type: "string", description: "Optional: monday, tuesday, etc." },
      },
      required: ["text"],
    },
    handler: async ({ text, goal_id, week_start, scheduled_day }: { text: string; goal_id?: string; week_start?: string; scheduled_day?: string }) => {
      const weekKey = week_start || getMondayOfWeek(new Date());
      const { data: existing } = await supabase
        .from("weekly_objectives")
        .select("order_index")
        .eq("user_id", userId)
        .eq("week_start", weekKey)
        .order("order_index", { ascending: false })
        .limit(1);

      const insertData: Record<string, unknown> = {
        user_id: userId,
        text,
        week_start: weekKey,
        order_index: (existing?.[0]?.order_index ?? -1) + 1,
        is_completed: false,
      };
      if (goal_id) insertData.goal_id = goal_id;
      if (scheduled_day) insertData.scheduled_day = scheduled_day;

      const { data, error } = await supabase.from("weekly_objectives").insert(insertData).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `✅ Created: "${text}" (${weekKey}) ID: ${data.id}` }] };
    },
  });

  mcp.tool("update_objective", {
    description: "Update a weekly objective (mark complete/incomplete, change text)",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Objective ID" },
        text: { type: "string", description: "New text" },
        is_completed: { type: "boolean", description: "Completed?" },
      },
      required: ["id"],
    },
    handler: async ({ id, text, is_completed }: { id: string; text?: string; is_completed?: boolean }) => {
      const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (text !== undefined) upd.text = text;
      if (is_completed !== undefined) upd.is_completed = is_completed;

      const { data, error } = await supabase
        .from("weekly_objectives")
        .update(upd)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `✅ "${data.text}" — ${data.is_completed ? "done ✓" : "in progress"}` }] };
    },
  });

  mcp.tool("delete_objective", {
    description: "Delete a weekly objective by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Objective ID" },
      },
      required: ["id"],
    },
    handler: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("weekly_objectives")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `🗑️ Objective deleted` }] };
    },
  });

  mcp.tool("log_habit_completion", {
    description: "Toggle a habit completion for a specific date",
    inputSchema: {
      type: "object",
      properties: {
        goal_id: { type: "string", description: "Goal ID" },
        habit_item_id: { type: "string", description: "Habit item ID" },
        date: { type: "string", description: "YYYY-MM-DD. Defaults to today." },
      },
      required: ["goal_id", "habit_item_id"],
    },
    handler: async ({ goal_id, habit_item_id, date }: { goal_id: string; habit_item_id: string; date?: string }) => {
      const dateStr = date || toDateStr(new Date());
      const { data: existing } = await supabase
        .from("habit_completions")
        .select("id")
        .eq("user_id", userId)
        .eq("goal_id", goal_id)
        .eq("habit_item_id", habit_item_id)
        .eq("completion_date", dateStr)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("habit_completions").delete().eq("id", existing.id);
        if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
        return { content: [{ type: "text" as const, text: `❌ Removed completion for ${dateStr}` }] };
      } else {
        const { error } = await supabase.from("habit_completions").insert({
          user_id: userId,
          goal_id,
          habit_item_id,
          completion_date: dateStr,
        });
        if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
        return { content: [{ type: "text" as const, text: `✅ Logged completion for ${dateStr}` }] };
      }
    },
  });

  mcp.tool("send_check_in", {
    description: "Send an accountability check-in message to a partner",
    inputSchema: {
      type: "object",
      properties: {
        partnership_id: { type: "string", description: "Partnership ID" },
        message: { type: "string", description: "Check-in message" },
      },
      required: ["partnership_id", "message"],
    },
    handler: async ({ partnership_id, message }: { partnership_id: string; message: string }) => {
      const { error } = await supabase.from("accountability_check_ins").insert({
        partnership_id,
        initiated_by: userId,
        message,
        week_start: getMondayOfWeek(new Date()),
      });
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `✅ Check-in sent: "${message}"` }] };
    },
  });

  mcp.tool("log_daily_check_in", {
    description: "Create or update today's daily check-in (mood, energy, focus, journal)",
    inputSchema: {
      type: "object",
      properties: {
        mood_rating: { type: "number", description: "1-5" },
        energy_level: { type: "number", description: "1-5" },
        focus_today: { type: "string" },
        quick_win: { type: "string" },
        blocker: { type: "string" },
        journal_entry: { type: "string" },
      },
    },
    handler: async ({ mood_rating, energy_level, focus_today, quick_win, blocker, journal_entry }: any) => {
      const today = toDateStr(new Date());
      const { data: existing } = await supabase
        .from("daily_check_ins")
        .select("id")
        .eq("user_id", userId)
        .eq("check_in_date", today)
        .maybeSingle();

      const d: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (mood_rating !== undefined) d.mood_rating = mood_rating;
      if (energy_level !== undefined) d.energy_level = energy_level;
      if (focus_today !== undefined) d.focus_today = focus_today;
      if (quick_win !== undefined) d.quick_win = quick_win;
      if (blocker !== undefined) d.blocker = blocker;
      if (journal_entry !== undefined) d.journal_entry = journal_entry;

      if (existing) {
        const { error } = await supabase.from("daily_check_ins").update(d).eq("id", existing.id);
        if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
        return { content: [{ type: "text" as const, text: `✅ Updated today's check-in` }] };
      } else {
        const { error } = await supabase
          .from("daily_check_ins")
          .insert({ ...d, user_id: userId, check_in_date: today });
        if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
        return { content: [{ type: "text" as const, text: `✅ Created today's check-in` }] };
      }
    },
  });

  mcp.tool("create_goal", {
    description: "Create a new goal with title, category, timeframe, and optional description",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Goal title" },
        timeframe: { type: "string", description: "yearly, quarterly, or monthly" },
        category: { type: "string", description: "Optional category (e.g. Health, Career, Finance)" },
        description: { type: "string", description: "Optional description" },
        start_date: { type: "string", description: "YYYY-MM-DD start date" },
        target_date: { type: "string", description: "YYYY-MM-DD target date" },
      },
      required: ["title", "timeframe"],
    },
    handler: async ({ title, timeframe, category, description, start_date, target_date }: any) => {
      const insertData: Record<string, unknown> = {
        user_id: userId,
        title,
        timeframe,
        status: "in_progress",
      };
      if (category) insertData.category = category;
      if (description) insertData.description = description;
      if (start_date) insertData.start_date = start_date;
      if (target_date) insertData.target_date = target_date;

      const { data, error } = await supabase.from("goals").insert(insertData).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `✅ Created goal: "${title}" (${timeframe}) ID: ${data.id}` }] };
    },
  });

  mcp.tool("update_goal", {
    description: "Update a goal's status (complete, pause, deprioritize), title, or description",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Goal ID" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" },
        status: { type: "string", description: "not_started, in_progress, completed, deprioritized" },
        is_paused: { type: "boolean", description: "Pause/unpause the goal" },
        category: { type: "string", description: "New category" },
      },
      required: ["id"],
    },
    handler: async ({ id, title, description, status, is_paused, category }: any) => {
      const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (title !== undefined) upd.title = title;
      if (description !== undefined) upd.description = description;
      if (status !== undefined) {
        upd.status = status;
        if (status === "completed") upd.completed_at = new Date().toISOString();
        if (status === "deprioritized") upd.deprioritized_at = new Date().toISOString();
      }
      if (is_paused !== undefined) {
        upd.is_paused = is_paused;
        upd.paused_at = is_paused ? new Date().toISOString() : null;
      }
      if (category !== undefined) upd.category = category;

      const { data, error } = await supabase
        .from("goals")
        .update(upd)
        .eq("id", id)
        .eq("user_id", userId)
        .select("id, title, status, is_paused")
        .single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `✅ Updated "${data.title}" — status: ${data.status}${data.is_paused ? " (paused)" : ""}` }] };
    },
  });

  mcp.tool("create_weekly_planning", {
    description: "Start or update a weekly planning session with intention and/or reflection",
    inputSchema: {
      type: "object",
      properties: {
        week_start: { type: "string", description: "YYYY-MM-DD Monday. Defaults to current week." },
        week_intention: { type: "string", description: "What you want to focus on this week" },
        last_week_reflection: { type: "string", description: "Reflection on last week" },
        is_completed: { type: "boolean", description: "Mark planning as completed" },
      },
    },
    handler: async ({ week_start, week_intention, last_week_reflection, is_completed }: any) => {
      const weekKey = week_start || getMondayOfWeek(new Date());
      const { data: existing } = await supabase
        .from("weekly_planning_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("week_start", weekKey)
        .maybeSingle();

      const d: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (week_intention !== undefined) d.week_intention = week_intention;
      if (last_week_reflection !== undefined) d.last_week_reflection = last_week_reflection;
      if (is_completed !== undefined) {
        d.is_completed = is_completed;
        if (is_completed) d.completed_at = new Date().toISOString();
      }

      if (existing) {
        const { error } = await supabase.from("weekly_planning_sessions").update(d).eq("id", existing.id);
        if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
        return { content: [{ type: "text" as const, text: `✅ Updated planning session for ${weekKey}` }] };
      } else {
        const { error } = await supabase
          .from("weekly_planning_sessions")
          .insert({ ...d, user_id: userId, week_start: weekKey });
        if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
        return { content: [{ type: "text" as const, text: `✅ Created planning session for ${weekKey}` }] };
      }
    },
  });
}

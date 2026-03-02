import { Hono } from "npm:hono@4";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function createAuthClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

/**
 * Authenticate via JWT or long-lived API token (kuj_*).
 * Returns { supabase, user } or { supabase, user: null }.
 */
async function getUser(authHeader: string) {
  const token = (authHeader || "").replace(/^Bearer\s+/i, "").trim();

  // ── API token path ──
  if (token.startsWith("kuj_")) {
    const svc = createServiceClient();
    const { data: userId, error } = await svc.rpc("validate_mcp_api_token", { p_token: token });
    if (error || !userId) return { supabase: svc, user: null };
    // Build an admin client scoped to the user for RLS bypass
    // We use the service client but attach the user id manually
    return { supabase: svc, user: { id: userId as string } };
  }

  // ── JWT path ──
  const supabase = createAuthClient(authHeader);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

const app = new Hono();
const mcp = new McpServer({ name: "kujituma-mcp", version: "1.0.0" });

// ── READ TOOLS ──────────────────────────────────────────────

mcp.tool("get_active_goals", {
  description: "Get all active goals for the authenticated user. Optionally filter by timeframe.",
  inputSchema: {
    type: "object",
    properties: {
      timeframe: { type: "string", description: "Filter: 'yearly', 'quarterly', 'monthly'" },
    },
  },
  handler: async (args: { timeframe?: string }, ctx) => {
    const { supabase, user } = await getUser(ctx.headers?.["authorization"] || "");
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }] };

    let query = supabase
      .from("goals")
      .select("id, title, description, category, timeframe, status, start_date, target_date, habit_items, is_recurring, recurrence_frequency, visibility")
      .eq("user_id", user.id)
      .not("status", "in", '("completed","deprioritized")')
      .eq("is_paused", false)
      .order("order_index", { ascending: true });

    if (args.timeframe) query = query.eq("timeframe", args.timeframe);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
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
  handler: async (args: { week_start?: string }, ctx) => {
    const { supabase, user } = await getUser(ctx.headers?.["authorization"] || "");
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }] };

    const weekKey = args.week_start || getMondayOfWeek(new Date());
    const { data, error } = await supabase
      .from("weekly_objectives")
      .select("id, text, is_completed, goal_id, order_index, scheduled_day, scheduled_time")
      .eq("user_id", user.id)
      .eq("week_start", weekKey)
      .order("order_index", { ascending: true });

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    const completed = data?.filter((o: any) => o.is_completed).length || 0;
    return { content: [{ type: "text", text: `Week ${weekKey}: ${completed}/${data?.length || 0} completed\n\n${JSON.stringify(data, null, 2)}` }] };
  },
});

mcp.tool("get_streaks", {
  description: "Get daily, weekly, and quarterly streaks",
  inputSchema: { type: "object", properties: {} },
  handler: async (_args: Record<string, never>, ctx) => {
    const { supabase, user } = await getUser(ctx.headers?.["authorization"] || "");
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }] };

    const { data, error } = await supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle();
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    if (!data) return { content: [{ type: "text", text: "No streak data yet." }] };

    return { content: [{ type: "text", text: [
      `Daily: ${data.current_daily_streak} (best: ${data.longest_daily_streak})`,
      `Weekly: ${data.current_weekly_streak} (best: ${data.longest_weekly_streak})`,
      `Quarterly: ${data.current_quarterly_streak} (best: ${data.longest_quarterly_streak})`,
      `Last check-in: ${data.last_check_in_date || "never"}`,
    ].join("\n") }] };
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
  handler: async (args: { week_start?: string }, ctx) => {
    const { supabase, user } = await getUser(ctx.headers?.["authorization"] || "");
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }] };

    const weekKey = args.week_start || getMondayOfWeek(new Date());
    const weekEnd = getWeekEnd(weekKey);
    const { data, error } = await supabase
      .from("habit_completions")
      .select("id, goal_id, habit_item_id, completion_date")
      .eq("user_id", user.id)
      .gte("completion_date", weekKey)
      .lte("completion_date", weekEnd)
      .order("completion_date");

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `${data?.length || 0} completions for week ${weekKey}\n\n${JSON.stringify(data, null, 2)}` }] };
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
  handler: async (args: { start_date?: string; end_date?: string }, ctx) => {
    const { supabase, user } = await getUser(ctx.headers?.["authorization"] || "");
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }] };

    const endD = args.end_date || toDateStr(new Date());
    const startD = args.start_date || toDateStr(new Date(Date.now() - 30 * 86400000));

    const [objRes, ciRes, habRes, goalRes] = await Promise.all([
      supabase.from("weekly_objectives").select("id, is_completed").eq("user_id", user.id).gte("week_start", startD).lte("week_start", endD),
      supabase.from("daily_check_ins").select("id, mood_rating, energy_level").eq("user_id", user.id).gte("check_in_date", startD).lte("check_in_date", endD),
      supabase.from("habit_completions").select("id").eq("user_id", user.id).gte("completion_date", startD).lte("completion_date", endD),
      supabase.from("goals").select("id, title, status, category").eq("user_id", user.id).not("status", "eq", "deprioritized"),
    ]);

    const obj = objRes.data || [];
    const ci = ciRes.data || [];
    const goals = goalRes.data || [];
    const done = obj.filter((o: any) => o.is_completed).length;
    const moodVals = ci.filter((c: any) => c.mood_rating).map((c: any) => c.mood_rating);
    const avgMood = moodVals.length ? (moodVals.reduce((a: number, b: number) => a + b, 0) / moodVals.length).toFixed(1) : "N/A";

    const cats: Record<string, number> = {};
    goals.forEach((g: any) => { cats[g.category || "Uncategorized"] = (cats[g.category || "Uncategorized"] || 0) + 1; });

    return { content: [{ type: "text", text: [
      `📊 ${startD} → ${endD}`,
      `Objectives: ${done}/${obj.length} (${obj.length ? Math.round(done / obj.length * 100) : 0}%)`,
      `Check-ins: ${ci.length} | Habit completions: ${habRes.data?.length || 0}`,
      `Avg mood: ${avgMood}/5`,
      `Goals: ${goals.filter((g: any) => g.status === "in_progress").length} active, ${goals.filter((g: any) => g.status === "completed").length} done`,
      `Categories: ${Object.entries(cats).map(([c, n]) => `${c}(${n})`).join(", ")}`,
    ].join("\n") }] };
  },
});

mcp.tool("get_partnerships", {
  description: "List active accountability partnerships with partner names",
  inputSchema: { type: "object", properties: {} },
  handler: async (_args: Record<string, never>, ctx) => {
    const { supabase, user } = await getUser(ctx.headers?.["authorization"] || "");
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }] };

    const { data, error } = await supabase
      .from("accountability_partnerships")
      .select("id, user1_id, user2_id, last_check_in_at")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq("status", "active");

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    if (!data?.length) return { content: [{ type: "text", text: "No active partnerships." }] };

    const partnerIds = data.map((p: any) => p.user1_id === user.id ? p.user2_id : p.user1_id);
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", partnerIds);
    const pMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);

    const lines = data.map((p: any) => {
      const pid = p.user1_id === user.id ? p.user2_id : p.user1_id;
      return `• ${pMap.get(pid) || "Unknown"} (partnership: ${p.id}) — last: ${p.last_check_in_at || "never"}`;
    });
    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
});

// ── WRITE TOOLS ─────────────────────────────────────────────

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
  handler: async (args: { text: string; goal_id?: string; week_start?: string; scheduled_day?: string }, ctx) => {
    const { supabase, user } = await getUser(ctx.headers?.["authorization"] || "");
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }] };

    const weekKey = args.week_start || getMondayOfWeek(new Date());
    const { data: existing } = await supabase
      .from("weekly_objectives")
      .select("order_index")
      .eq("user_id", user.id)
      .eq("week_start", weekKey)
      .order("order_index", { ascending: false })
      .limit(1);

    const insertData: Record<string, unknown> = {
      user_id: user.id, text: args.text, week_start: weekKey,
      order_index: (existing?.[0]?.order_index ?? -1) + 1, is_completed: false,
    };
    if (args.goal_id) insertData.goal_id = args.goal_id;
    if (args.scheduled_day) insertData.scheduled_day = args.scheduled_day;

    const { data, error } = await supabase.from("weekly_objectives").insert(insertData).select().single();
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `✅ Created: "${args.text}" (${weekKey}) ID: ${data.id}` }] };
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
  handler: async (args: { id: string; text?: string; is_completed?: boolean }, ctx) => {
    const { supabase, user } = await getUser(ctx.headers?.["authorization"] || "");
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }] };

    const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (args.text !== undefined) upd.text = args.text;
    if (args.is_completed !== undefined) upd.is_completed = args.is_completed;

    const { data, error } = await supabase.from("weekly_objectives").update(upd).eq("id", args.id).eq("user_id", user.id).select().single();
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `✅ "${data.text}" — ${data.is_completed ? "done ✓" : "in progress"}` }] };
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
  handler: async (args: { goal_id: string; habit_item_id: string; date?: string }, ctx) => {
    const { supabase, user } = await getUser(ctx.headers?.["authorization"] || "");
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }] };

    const dateStr = args.date || toDateStr(new Date());
    const { data: existing } = await supabase
      .from("habit_completions").select("id")
      .eq("user_id", user.id).eq("goal_id", args.goal_id)
      .eq("habit_item_id", args.habit_item_id).eq("completion_date", dateStr)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("habit_completions").delete().eq("id", existing.id);
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: `❌ Removed completion for ${dateStr}` }] };
    } else {
      const { error } = await supabase.from("habit_completions").insert({ user_id: user.id, goal_id: args.goal_id, habit_item_id: args.habit_item_id, completion_date: dateStr });
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: `✅ Logged completion for ${dateStr}` }] };
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
  handler: async (args: { partnership_id: string; message: string }, ctx) => {
    const { supabase, user } = await getUser(ctx.headers?.["authorization"] || "");
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }] };

    const { data, error } = await supabase
      .from("accountability_check_ins")
      .insert({ partnership_id: args.partnership_id, initiated_by: user.id, message: args.message, week_start: getMondayOfWeek(new Date()) })
      .select().single();

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `✅ Check-in sent: "${args.message}"` }] };
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
  handler: async (args: { mood_rating?: number; energy_level?: number; focus_today?: string; quick_win?: string; blocker?: string; journal_entry?: string }, ctx) => {
    const { supabase, user } = await getUser(ctx.headers?.["authorization"] || "");
    if (!user) return { content: [{ type: "text", text: "Unauthorized" }] };

    const today = toDateStr(new Date());
    const { data: existing } = await supabase.from("daily_check_ins").select("id").eq("user_id", user.id).eq("check_in_date", today).maybeSingle();

    const d: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (args.mood_rating !== undefined) d.mood_rating = args.mood_rating;
    if (args.energy_level !== undefined) d.energy_level = args.energy_level;
    if (args.focus_today !== undefined) d.focus_today = args.focus_today;
    if (args.quick_win !== undefined) d.quick_win = args.quick_win;
    if (args.blocker !== undefined) d.blocker = args.blocker;
    if (args.journal_entry !== undefined) d.journal_entry = args.journal_entry;

    if (existing) {
      const { error } = await supabase.from("daily_check_ins").update(d).eq("id", existing.id);
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: `✅ Updated today's check-in` }] };
    } else {
      const { error } = await supabase.from("daily_check_ins").insert({ ...d, user_id: user.id, check_in_date: today });
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: `✅ Created today's check-in` }] };
    }
  },
});

// ── HELPERS ─────────────────────────────────────────────────

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return toDateStr(d);
}

function getWeekEnd(monday: string): string {
  const d = new Date(monday + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return toDateStr(d);
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ── HTTP TRANSPORT ──────────────────────────────────────────

const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcp);

app.all("/*", async (c) => {
  if (c.req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const response = await httpHandler(c.req.raw);
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: newHeaders });
});

Deno.serve(app.fetch);

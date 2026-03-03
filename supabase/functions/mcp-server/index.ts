import { Hono } from "npm:hono@4";
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPTransport } from "npm:@hono/mcp";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

// ── AUTH HELPERS ────────────────────────────────────────────

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
    { global: { headers: { Authorization: authHeader } } },
  );
}

/**
 * Authenticate via:
 * 1. Authorization header (Bearer JWT or Bearer kuj_*)
 * 2. ?token= query param (for Claude.ai web connector)
 */
async function getUser(request: Request) {
  let token = "";

  // Check Authorization header first
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader) {
    token = authHeader.replace(/^Bearer\s+/i, "").trim();
  }

  // Fall back to ?token= query param (Claude.ai web connector)
  if (!token) {
    const url = new URL(request.url);
    token = url.searchParams.get("token") || "";
  }

  if (!token) return { supabase: createServiceClient(), user: null };

  // ── API token path (kuj_*) ──
  if (token.startsWith("kuj_")) {
    const svc = createServiceClient();
    const { data: userId, error } = await svc.rpc("validate_mcp_api_token", {
      p_token: token,
    });
    if (error || !userId) return { supabase: svc, user: null };
    return { supabase: svc, user: { id: userId as string } };
  }

  // ── JWT path ──
  const bearer = `Bearer ${token}`;
  const supabase = createAuthClient(bearer);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

// ── DATE HELPERS ───────────────────────────────────────────

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

// ── MCP SERVER FACTORY ─────────────────────────────────────

function createConfiguredServer(supabase: ReturnType<typeof createClient>, userId: string) {
  const mcp = new McpServer({ name: "kujituma-mcp", version: "1.0.0" });

  // ── READ TOOLS ──

  mcp.tool(
    "get_active_goals",
    "Get all active goals for the authenticated user. Optionally filter by timeframe.",
    { timeframe: z.string().optional().describe("Filter: 'yearly', 'quarterly', 'monthly'") },
    async ({ timeframe }) => {
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
  );

  mcp.tool(
    "get_weekly_objectives",
    "Get weekly objectives for a given week (Monday-based). Defaults to current week.",
    { week_start: z.string().optional().describe("YYYY-MM-DD Monday. Defaults to current week.") },
    async ({ week_start }) => {
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
  );

  mcp.tool(
    "get_streaks",
    "Get daily, weekly, and quarterly streaks",
    {},
    async () => {
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
  );

  mcp.tool(
    "get_habit_completions",
    "Get habit completions for a given week",
    { week_start: z.string().optional().describe("YYYY-MM-DD Monday. Defaults to current week.") },
    async ({ week_start }) => {
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
  );

  mcp.tool(
    "get_analytics_summary",
    "Productivity analytics: objectives, check-ins, habits, goals over a date range",
    {
      start_date: z.string().optional().describe("YYYY-MM-DD. Defaults to 30 days ago."),
      end_date: z.string().optional().describe("YYYY-MM-DD. Defaults to today."),
    },
    async ({ start_date, end_date }) => {
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
  );

  mcp.tool(
    "get_partnerships",
    "List active accountability partnerships with partner names",
    {},
    async () => {
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
  );

  // ── WRITE TOOLS ──

  mcp.tool(
    "create_objective",
    "Create a weekly objective for the current or specified week",
    {
      text: z.string().describe("Objective text"),
      goal_id: z.string().optional().describe("Optional goal ID to link to"),
      week_start: z.string().optional().describe("YYYY-MM-DD Monday. Defaults to current week."),
      scheduled_day: z.string().optional().describe("Optional: monday, tuesday, etc."),
    },
    async ({ text, goal_id, week_start, scheduled_day }) => {
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
  );

  mcp.tool(
    "update_objective",
    "Update a weekly objective (mark complete/incomplete, change text)",
    {
      id: z.string().describe("Objective ID"),
      text: z.string().optional().describe("New text"),
      is_completed: z.boolean().optional().describe("Completed?"),
    },
    async ({ id, text, is_completed }) => {
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
  );

  mcp.tool(
    "log_habit_completion",
    "Toggle a habit completion for a specific date",
    {
      goal_id: z.string().describe("Goal ID"),
      habit_item_id: z.string().describe("Habit item ID"),
      date: z.string().optional().describe("YYYY-MM-DD. Defaults to today."),
    },
    async ({ goal_id, habit_item_id, date }) => {
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
  );

  mcp.tool(
    "send_check_in",
    "Send an accountability check-in message to a partner",
    {
      partnership_id: z.string().describe("Partnership ID"),
      message: z.string().describe("Check-in message"),
    },
    async ({ partnership_id, message }) => {
      const { error } = await supabase.from("accountability_check_ins").insert({
        partnership_id,
        initiated_by: userId,
        message,
        week_start: getMondayOfWeek(new Date()),
      });
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `✅ Check-in sent: "${message}"` }] };
    },
  );

  mcp.tool(
    "log_daily_check_in",
    "Create or update today's daily check-in (mood, energy, focus, journal)",
    {
      mood_rating: z.number().optional().describe("1-5"),
      energy_level: z.number().optional().describe("1-5"),
      focus_today: z.string().optional(),
      quick_win: z.string().optional(),
      blocker: z.string().optional(),
      journal_entry: z.string().optional(),
    },
    async ({ mood_rating, energy_level, focus_today, quick_win, blocker, journal_entry }) => {
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
  );

  return mcp;
}

// ── HONO APP ───────────────────────────────────────────────

const app = new Hono();

app.all("/*", async (c) => {
  if (c.req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate
  const { supabase, user } = await getUser(c.req.raw);
  if (!user) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Unauthorized — provide a valid API token or JWT" },
        id: null,
      }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Create per-request MCP server with auth context
  const mcp = createConfiguredServer(supabase, user.id);
  const transport = new StreamableHTTPTransport({ sessionIdGenerator: undefined });
  await mcp.connect(transport);

  try {
    const response = await transport.handleRequest(c);
    // Add CORS headers to response
    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (err) {
    console.error("MCP handler error:", err);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

Deno.serve(app.fetch);

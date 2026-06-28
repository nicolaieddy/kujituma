import type { createClient } from "npm:@supabase/supabase-js@2";

type Supabase = ReturnType<typeof createClient>;
type McpServer = any;

const TYPES = ["Article","Video","Article + Video","Podcast","Panel / Speaking","Press Conference","Interview","Quote","Social"];
const STATUSES = ["Published","Upcoming","Draft"];
const URL_STATUSES = ["verified","verify","needs-url","no-url","dead"];

export function registerMediaTools(mcp: McpServer, supabase: Supabase, userId: string) {
  mcp.tool("list_media", {
    description: "List media mentions for the authenticated user. Optional filters: year, type, tag, status. Returns newest first.",
    inputSchema: {
      type: "object",
      properties: {
        year: { type: "number" },
        type: { type: "string", description: `One of: ${TYPES.join(", ")}` },
        tag: { type: "string", description: "Tag to match (mention must contain this tag)" },
        status: { type: "string", description: `One of: ${STATUSES.join(", ")}` },
        limit: { type: "number", description: "Default 100, max 500" },
      },
    },
    handler: async (args: any) => {
      let q = supabase.from("media_mentions").select("*").eq("user_id", userId)
        .order("date", { ascending: false }).limit(Math.min(args.limit ?? 100, 500));
      if (args.year) q = q.eq("year", args.year);
      if (args.type) q = q.eq("type", args.type);
      if (args.status) q = q.eq("status", args.status);
      if (args.tag) q = q.contains("tags", [args.tag]);
      const { data, error } = await q;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  });

  mcp.tool("search_media", {
    description: "Full-text search across title, outlet, summary, and tags of the user's media mentions.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, limit: { type: "number" } },
      required: ["query"],
    },
    handler: async ({ query, limit }: { query: string; limit?: number }) => {
      const ilike = `%${query.replace(/[%_]/g, "")}%`;
      const { data, error } = await supabase.from("media_mentions").select("*")
        .eq("user_id", userId)
        .or(`title.ilike.${ilike},outlet.ilike.${ilike},summary.ilike.${ilike}`)
        .order("date", { ascending: false }).limit(Math.min(limit ?? 50, 200));
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      const tagMatched = (data ?? []).filter((r: any) => r.tags?.some((t: string) => t.toLowerCase().includes(query.toLowerCase())));
      const merged = Array.from(new Map([...(data ?? []), ...tagMatched].map((r: any) => [r.id, r])).values());
      return { content: [{ type: "text" as const, text: JSON.stringify(merged, null, 2) }] };
    },
  });

  mcp.tool("get_media_stats", {
    description: "Aggregate counts of the user's media mentions: total, featured, by year, by type, by outlet (top 10).",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const { data, error } = await supabase.from("media_mentions").select("year,type,outlet,featured,url_status,status")
        .eq("user_id", userId).limit(5000);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      const byYear: Record<string, number> = {};
      const byType: Record<string, number> = {};
      const byOutlet: Record<string, number> = {};
      let featured = 0, needsUrl = 0;
      for (const r of data as any[]) {
        byYear[r.year] = (byYear[r.year] ?? 0) + 1;
        byType[r.type] = (byType[r.type] ?? 0) + 1;
        const o = (r.outlet || "—").trim();
        byOutlet[o] = (byOutlet[o] ?? 0) + 1;
        if (r.featured) featured++;
        if (r.url_status === "needs-url") needsUrl++;
      }
      const topOutlets = Object.entries(byOutlet).sort((a,b) => b[1]-a[1]).slice(0,10);
      return { content: [{ type: "text" as const, text: JSON.stringify({
        total: data?.length ?? 0, featured, needs_url: needsUrl,
        by_year: byYear, by_type: byType, top_outlets: Object.fromEntries(topOutlets),
      }, null, 2) }] };
    },
  });

  mcp.tool("add_media_candidate", {
    description: "Add a media mention to the user's REVIEW INBOX (media_candidates). Use this for any agent-discovered mention — never write directly to canonical. Source is forced to 'mcp-agent'. Owner reviews and approves in-app.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD (optional)" },
        outlet: { type: "string" },
        type: { type: "string", description: `One of: ${TYPES.join(", ")}` },
        url: { type: "string" },
        url_status: { type: "string", description: `One of: ${URL_STATUSES.join(", ")}` },
        summary: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        raw_snippet: { type: "string", description: "Excerpt of the source text supporting this mention" },
        confidence: { type: "number", description: "0..1" },
      },
      required: ["title"],
    },
    handler: async (args: any) => {
      const { data, error } = await supabase.from("media_candidates").insert({
        user_id: userId,
        title: args.title,
        date: args.date ?? null,
        outlet: args.outlet ?? "",
        type: args.type ?? "Article",
        url: args.url ?? null,
        url_status: args.url_status ?? (args.url ? "verify" : "needs-url"),
        summary: args.summary ?? null,
        tags: args.tags ?? [],
        raw_snippet: args.raw_snippet ?? null,
        confidence: args.confidence ?? null,
        source: "mcp-agent",
        review_status: "pending",
      }).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true, candidate_id: data.id }, null, 2) }] };
    },
  });

  mcp.tool("add_media", {
    description: "Owner-only: directly add a media mention to the canonical media_mentions table (skips the review inbox). Use when the user/owner explicitly logs a mention.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        outlet: { type: "string" },
        type: { type: "string" },
        url: { type: "string" },
        url_status: { type: "string" },
        summary: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        status: { type: "string", description: `One of: ${STATUSES.join(", ")}` },
        sentiment: { type: "string", description: "positive | neutral | negative" },
        featured: { type: "boolean" },
        is_public: { type: "boolean" },
      },
      required: ["title", "date"],
    },
    handler: async (args: any) => {
      const { data, error } = await supabase.from("media_mentions").insert({
        user_id: userId,
        title: args.title,
        date: args.date,
        outlet: args.outlet ?? "",
        type: args.type ?? "Article",
        url: args.url ?? null,
        url_status: args.url_status ?? (args.url ? "verify" : "needs-url"),
        summary: args.summary ?? null,
        tags: args.tags ?? [],
        status: args.status ?? "Published",
        sentiment: args.sentiment ?? null,
        featured: args.featured ?? false,
        is_public: args.is_public ?? false,
        source: "mcp-agent",
      }).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true, id: data.id }, null, 2) }] };
    },
  });

  mcp.tool("update_media", {
    description: "Update fields on an existing media mention owned by the user. Pass `id` and any subset of mutable fields.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" }, date: { type: "string" }, outlet: { type: "string" },
        type: { type: "string" }, url: { type: "string" }, url_status: { type: "string" },
        summary: { type: "string" }, tags: { type: "array", items: { type: "string" } },
        status: { type: "string" }, sentiment: { type: "string" },
        featured: { type: "boolean" }, is_public: { type: "boolean" },
        archived_url: { type: "string" },
      },
      required: ["id"],
    },
    handler: async (args: any) => {
      const { id, ...patch } = args;
      const { data, error } = await supabase.from("media_mentions").update(patch)
        .eq("id", id).eq("user_id", userId).select().maybeSingle();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data) return { content: [{ type: "text" as const, text: "Not found" }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true, mention: data }, null, 2) }] };
    },
  });
}

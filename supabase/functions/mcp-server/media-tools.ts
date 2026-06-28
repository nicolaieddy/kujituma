import type { createClient } from "npm:@supabase/supabase-js@2";

type Supabase = ReturnType<typeof createClient>;
type McpServer = any;

const TYPES = ["Article","Video","Article + Video","Podcast","Panel / Speaking","Press Conference","Interview","Quote","Social","Profile","Event / Speaking"];
const STATUSES = ["Published","Upcoming","Draft"];
const URL_STATUSES = ["verified","verify","needs-url","no-url","dead"];
const SENTIMENTS = ["positive","neutral","negative"];
const SOURCES = ["manual","web-scan","google-alert","mcp-agent","import"];

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|mc_(cid|eid)$|igshid$|ref$|ref_src$|si$|spm$)/i;

function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    const keep: [string, string][] = [];
    for (const [k, v] of u.searchParams) {
      if (!TRACKING_PARAMS.test(k)) keep.push([k, v]);
    }
    u.search = "";
    for (const [k, v] of keep) u.searchParams.append(k, v);
    u.hash = "";
    let out = u.toString();
    // strip trailing slash on path-only urls
    if (u.pathname !== "/" && out.endsWith("/")) out = out.slice(0, -1);
    if (u.pathname === "/" && out.endsWith("/")) out = out.slice(0, -1);
    return out.toLowerCase();
  } catch {
    return s.toLowerCase().replace(/\/+$/, "");
  }
}

function coerceTags(input: unknown): string[] | undefined {
  if (input === undefined || input === null) return undefined;
  if (Array.isArray(input)) return input.map((s) => String(s).trim()).filter(Boolean);
  return String(input).split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
}

function validateEnum(value: unknown, allowed: string[], field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  const v = String(value);
  if (!allowed.includes(v)) {
    throw new Error(`Invalid ${field}: "${v}". Must be one of: ${allowed.join(", ")}`);
  }
  return v;
}

function buildMentionPatch(input: any, opts: { defaultSource?: string } = {}) {
  const patch: Record<string, any> = {};
  if (input.title !== undefined) patch.title = String(input.title);
  if (input.outlet !== undefined) patch.outlet = String(input.outlet ?? "");
  if (input.date !== undefined && input.date !== null && input.date !== "") {
    patch.date = String(input.date);
    // NOTE: media_mentions.year is a GENERATED column derived from date.
    // Do NOT include it in INSERT/UPDATE — Postgres rejects with
    // "cannot insert a non-DEFAULT value into column 'year'".
  }
  if (input.url !== undefined) {
    patch.url = normalizeUrl(input.url);
  }
  const type = validateEnum(input.type, TYPES, "type");
  if (type) patch.type = type;
  const status = validateEnum(input.status, STATUSES, "status");
  if (status) patch.status = status;
  const sentiment = validateEnum(input.sentiment, SENTIMENTS, "sentiment");
  if (sentiment) patch.sentiment = sentiment;
  const urlStatus = validateEnum(input.url_status, URL_STATUSES, "url_status");
  if (urlStatus) patch.url_status = urlStatus;
  else if (input.url !== undefined && !input.url_status) {
    patch.url_status = patch.url ? "verify" : "needs-url";
  }
  const source = validateEnum(input.source, SOURCES, "source");
  if (source) patch.source = source;
  else if (opts.defaultSource) patch.source = opts.defaultSource;
  if (input.summary !== undefined) patch.summary = input.summary ? String(input.summary) : null;
  const tags = coerceTags(input.tags);
  if (tags !== undefined) patch.tags = tags;
  if (input.featured !== undefined) patch.featured = Boolean(input.featured);
  if (input.is_public !== undefined) patch.is_public = Boolean(input.is_public);
  if (input.archived_url !== undefined) patch.archived_url = input.archived_url ? String(input.archived_url) : null;
  if (input.news_announcement_group !== undefined) patch.news_announcement_group = input.news_announcement_group ? String(input.news_announcement_group) : null;
  if (input.article_type_tag !== undefined) patch.article_type_tag = input.article_type_tag ? String(input.article_type_tag) : null;
  if (input.nicolai_mention_type !== undefined) patch.nicolai_mention_type = input.nicolai_mention_type ? String(input.nicolai_mention_type) : null;
  if (input.verification_notes !== undefined) patch.verification_notes = input.verification_notes ? String(input.verification_notes) : null;
  if (input.last_checked !== undefined) patch.last_checked = input.last_checked ? String(input.last_checked) : null;
  if (input.date_added !== undefined) patch.date_added = input.date_added ? String(input.date_added) : null;
  return patch;
}

async function upsertOne(supabase: Supabase, userId: string, input: any, defaultSource = "manual") {
  const patch = buildMentionPatch(input, { defaultSource });
  if (!patch.title) throw new Error("title is required");
  if (!patch.date) throw new Error("date is required");
  const normUrl: string | null = patch.url ?? null;

  if (normUrl) {
    // url-based upsert
    const { data: existing } = await supabase
      .from("media_mentions")
      .select("id")
      .eq("user_id", userId)
      .ilike("url", normUrl)
      .maybeSingle();
    if (existing) {
      const { data, error } = await supabase
        .from("media_mentions").update(patch)
        .eq("id", existing.id).eq("user_id", userId)
        .select().single();
      if (error) throw new Error(error.message);
      return { action: "updated" as const, mention: data };
    }
    const { data, error } = await supabase
      .from("media_mentions").insert({ user_id: userId, ...patch })
      .select().single();
    if (error) throw new Error(error.message);
    return { action: "inserted" as const, mention: data };
  }

  // soft key: title + outlet + date
  const { data: soft } = await supabase
    .from("media_mentions")
    .select("id")
    .eq("user_id", userId)
    .eq("title", patch.title)
    .eq("outlet", patch.outlet ?? "")
    .eq("date", patch.date)
    .maybeSingle();
  if (soft) {
    const { data, error } = await supabase
      .from("media_mentions").update(patch)
      .eq("id", soft.id).eq("user_id", userId)
      .select().single();
    if (error) throw new Error(error.message);
    return { action: "updated" as const, mention: data };
  }
  const { data, error } = await supabase
    .from("media_mentions").insert({ user_id: userId, ...patch })
    .select().single();
  if (error) throw new Error(error.message);
  return { action: "inserted" as const, mention: data };
}

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

  // ── New canonical tools ──────────────────────────────────────

  const MENTION_INPUT_PROPS: Record<string, any> = {
    title: { type: "string" },
    date: { type: "string", description: "YYYY-MM-DD (event/publish date; start date if multi-day)" },
    outlet: { type: "string" },
    type: { type: "string", description: `One of: ${TYPES.join(", ")}` },
    url: { type: "string" },
    url_status: { type: "string", description: `One of: ${URL_STATUSES.join(", ")}` },
    summary: { type: "string" },
    tags: { type: ["array","string"], items: { type: "string" }, description: "Array of tags, or comma-separated string" },
    status: { type: "string", description: `One of: ${STATUSES.join(", ")}` },
    sentiment: { type: "string", description: `One of: ${SENTIMENTS.join(", ")}` },
    featured: { type: "boolean" },
    source: { type: "string", description: `One of: ${SOURCES.join(", ")}` },
    archived_url: { type: "string" },
    is_public: { type: "boolean" },
    news_announcement_group: { type: "string", description: "Groups syndicated coverage of one announcement" },
    article_type_tag: { type: "string" },
    nicolai_mention_type: { type: "string" },
    verification_notes: { type: "string" },
    last_checked: { type: "string", description: "YYYY-MM-DD" },
    date_added: { type: "string", description: "YYYY-MM-DD; defaults to today" },
  };

  mcp.tool("upsert_media_mention", {
    description: "Create or update a single media mention. Idempotent by normalized URL (lowercased, tracking params stripped); falls back to (title, outlet, date) when URL is absent. Year is derived from date.",
    inputSchema: { type: "object", properties: MENTION_INPUT_PROPS, required: ["title","date"] },
    handler: async (args: any) => {
      try {
        const res = await upsertOne(supabase, userId, args, "manual");
        return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true, ...res }, null, 2) }] };
      } catch (e: any) {
        return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
      }
    },
  });

  mcp.tool("bulk_upsert_media_mentions", {
    description: "Bulk ingest array of media mention rows (xlsx/CSV import). Same dedup rules as upsert_media_mention. Default source='import' unless row sets it. Returns counts and per-row errors.",
    inputSchema: {
      type: "object",
      properties: {
        rows: { type: "array", items: { type: "object", properties: MENTION_INPUT_PROPS } },
        default_source: { type: "string", description: `Override default source. One of: ${SOURCES.join(", ")}` },
      },
      required: ["rows"],
    },
    handler: async ({ rows, default_source }: any) => {
      const defSrc = validateEnum(default_source, SOURCES, "default_source") ?? "import";
      let inserted = 0, updated = 0, skipped = 0;
      const errors: { index: number; message: string; row?: any }[] = [];
      for (let i = 0; i < (rows ?? []).length; i++) {
        const row = rows[i];
        try {
          const res = await upsertOne(supabase, userId, row, defSrc);
          if (res.action === "inserted") inserted++; else updated++;
        } catch (e: any) {
          skipped++;
          errors.push({ index: i, message: e.message, row });
        }
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ inserted, updated, skipped, errors }, null, 2) }] };
    },
  });

  mcp.tool("list_media_mentions", {
    description: "List media mentions with rich filters: year, date_from, date_to, outlet, type, tag, featured, status, news_announcement_group. Supports sort, limit, offset.",
    inputSchema: {
      type: "object",
      properties: {
        year: { type: "number" },
        date_from: { type: "string", description: "YYYY-MM-DD" },
        date_to: { type: "string", description: "YYYY-MM-DD" },
        outlet: { type: "string" },
        type: { type: "string" },
        tag: { type: "string" },
        featured: { type: "boolean" },
        status: { type: "string" },
        news_announcement_group: { type: "string" },
        sort: { type: "string", description: "Column to sort by, default 'date'" },
        ascending: { type: "boolean", description: "Default false (newest first)" },
        limit: { type: "number", description: "Default 100, max 500" },
        offset: { type: "number" },
      },
    },
    handler: async (args: any) => {
      const limit = Math.min(args.limit ?? 100, 500);
      const offset = args.offset ?? 0;
      let q = supabase.from("media_mentions").select("*", { count: "exact" }).eq("user_id", userId);
      if (args.year) q = q.eq("year", args.year);
      if (args.date_from) q = q.gte("date", args.date_from);
      if (args.date_to) q = q.lte("date", args.date_to);
      if (args.outlet) q = q.ilike("outlet", `%${args.outlet}%`);
      if (args.type) q = q.eq("type", args.type);
      if (args.status) q = q.eq("status", args.status);
      if (args.news_announcement_group) q = q.eq("news_announcement_group", args.news_announcement_group);
      if (args.featured !== undefined) q = q.eq("featured", args.featured);
      if (args.tag) q = q.contains("tags", [args.tag]);
      q = q.order(args.sort ?? "date", { ascending: args.ascending ?? false }).range(offset, offset + limit - 1);
      const { data, error, count } = await q;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ total: count, count: data?.length ?? 0, offset, limit, items: data }, null, 2) }] };
    },
  });

  mcp.tool("get_media_mention", {
    description: "Fetch a single mention by id or by URL (URL is normalized before lookup).",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" }, url: { type: "string" } },
    },
    handler: async ({ id, url }: any) => {
      if (!id && !url) return { content: [{ type: "text" as const, text: "Error: provide id or url" }] };
      let q = supabase.from("media_mentions").select("*").eq("user_id", userId).limit(1);
      if (id) q = q.eq("id", id);
      else q = q.ilike("url", normalizeUrl(url) ?? "");
      const { data, error } = await q.maybeSingle();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data) return { content: [{ type: "text" as const, text: "Not found" }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  });

  mcp.tool("set_media_featured", {
    description: "Toggle the featured flag on a mention (for press-page highlighting).",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" }, featured: { type: "boolean" } },
      required: ["id", "featured"],
    },
    handler: async ({ id, featured }: any) => {
      const { data, error } = await supabase.from("media_mentions").update({ featured })
        .eq("id", id).eq("user_id", userId).select().maybeSingle();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!data) return { content: [{ type: "text" as const, text: "Not found" }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true, mention: data }, null, 2) }] };
    },
  });

  mcp.tool("delete_media_mention", {
    description: "Delete a media mention by id (owner-scoped).",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    handler: async ({ id }: any) => {
      const { error } = await supabase.from("media_mentions").delete().eq("id", id).eq("user_id", userId);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true, deleted: id }) }] };
    },
  });

  mcp.tool("get_media_summary", {
    description: "Aggregate counts of media mentions: total, featured, by year, by type, by outlet (top 10), by announcement group, and announcements with multi-outlet coverage.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const { data, error } = await supabase.from("media_mentions")
        .select("year,type,outlet,featured,news_announcement_group,status,url_status").eq("user_id", userId).limit(5000);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      const byYear: Record<string, number> = {};
      const byType: Record<string, number> = {};
      const byOutlet: Record<string, number> = {};
      const byGroup: Record<string, { count: number; outlets: Set<string> }> = {};
      let featured = 0, needsUrl = 0;
      for (const r of data as any[]) {
        byYear[r.year] = (byYear[r.year] ?? 0) + 1;
        byType[r.type] = (byType[r.type] ?? 0) + 1;
        const o = (r.outlet || "—").trim();
        byOutlet[o] = (byOutlet[o] ?? 0) + 1;
        if (r.featured) featured++;
        if (r.url_status === "needs-url") needsUrl++;
        if (r.news_announcement_group) {
          if (!byGroup[r.news_announcement_group]) byGroup[r.news_announcement_group] = { count: 0, outlets: new Set() };
          byGroup[r.news_announcement_group].count++;
          byGroup[r.news_announcement_group].outlets.add(o);
        }
      }
      const topOutlets = Object.entries(byOutlet).sort((a,b)=>b[1]-a[1]).slice(0,10);
      const announcements = Object.entries(byGroup).map(([group, v]) => ({
        group, count: v.count, outlets: Array.from(v.outlets),
      })).sort((a,b)=>b.count-a.count);
      const multiOutletAnnouncements = announcements.filter((a) => a.outlets.length > 1);
      return { content: [{ type: "text" as const, text: JSON.stringify({
        total: data?.length ?? 0, featured, needs_url: needsUrl,
        by_year: byYear, by_type: byType, top_outlets: Object.fromEntries(topOutlets),
        announcements, multi_outlet_announcements: multiOutletAnnouncements,
      }, null, 2) }] };
    },
  });
}

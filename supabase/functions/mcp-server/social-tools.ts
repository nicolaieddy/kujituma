import type { createClient } from "npm:@supabase/supabase-js@2";

type Supabase = ReturnType<typeof createClient>;
type McpServer = any;

const PLATFORMS = ["linkedin", "x", "instagram", "tiktok"] as const;
const STATUSES = ["idea", "drafting", "in_review", "ready", "scheduled", "published"] as const;

function asArray<T = string>(v: unknown): T[] | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v as T[];
  return undefined;
}

export function registerSocialTools(mcp: McpServer, supabase: Supabase, userId: string) {
  // ── Posts ────────────────────────────────────────────
  mcp.tool("list_social_posts", {
    description:
      "List social posts in the user's content pipeline (LinkedIn, X, Instagram, TikTok). Returns full rows with platforms, pillars, status, publish_date, live_url. Use filters to narrow.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: `One of: ${STATUSES.join(", ")}` },
        platform: { type: "string", description: `One of: ${PLATFORMS.join(", ")}` },
        pillar: { type: "string", description: "Match posts tagged with this pillar" },
        from_date: { type: "string", description: "YYYY-MM-DD, filters by publish_date >= " },
        to_date: { type: "string", description: "YYYY-MM-DD, filters by publish_date <= " },
        goal_id: { type: "string" },
        limit: { type: "number", description: "Default 100" },
      },
    },
    handler: async (args: any) => {
      let q = supabase
        .from("social_posts")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(args.limit ?? 100);
      if (args.status) q = q.eq("status", args.status);
      if (args.platform) q = q.contains("platforms", [args.platform]);
      if (args.pillar) q = q.contains("pillars", [args.pillar]);
      if (args.goal_id) q = q.eq("goal_id", args.goal_id);
      if (args.from_date) q = q.gte("publish_date", args.from_date);
      if (args.to_date) q = q.lte("publish_date", args.to_date);
      const { data, error } = await q;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  });

  mcp.tool("get_social_post", {
    description: "Get one social post by id along with its full metrics snapshot history.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    handler: async ({ id }: { id: string }) => {
      const { data: post, error } = await supabase
        .from("social_posts").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      if (!post) return { content: [{ type: "text" as const, text: "Not found" }] };
      const { data: metrics } = await supabase
        .from("social_post_metrics").select("*").eq("post_id", id).order("metrics_as_of", { ascending: false });
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ post, metrics: metrics ?? [] }, null, 2) }],
      };
    },
  });

  mcp.tool("create_social_post", {
    description:
      "Create a new social post draft. Defaults: status='idea', trust_check='not_checked', hold=false. Pass `platforms` array (subset of linkedin|x|instagram|tiktok) and 1-2 `pillars`.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        status: { type: "string" },
        platforms: { type: "array", items: { type: "string" } },
        pillars: { type: "array", items: { type: "string" } },
        publish_date: { type: "string", description: "YYYY-MM-DD" },
        live_url: { type: "string" },
        trust_check: { type: "string" },
        hold: { type: "boolean" },
        goal_id: { type: "string" },
        review_notes: { type: "string" },
        retro: { type: "string" },
      },
      required: ["title"],
    },
    handler: async (args: any) => {
      const insert: Record<string, unknown> = {
        user_id: userId,
        title: args.title,
      };
      for (const k of ["body", "status", "publish_date", "live_url", "trust_check", "goal_id", "review_notes", "retro"]) {
        if (args[k] !== undefined && args[k] !== "") insert[k] = args[k];
      }
      if (args.hold !== undefined) insert.hold = args.hold;
      const platforms = asArray(args.platforms);
      if (platforms) insert.platforms = platforms.filter((p) => (PLATFORMS as readonly string[]).includes(p));
      const pillars = asArray(args.pillars);
      if (pillars) insert.pillars = pillars;

      const { data, error } = await supabase.from("social_posts").insert(insert).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `✅ Created post "${data.title}" (id: ${data.id})` }] };
    },
  });

  mcp.tool("update_social_post", {
    description: "Update a social post. Pass any subset of fields. Pass empty string to clear nullable text fields.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
        status: { type: "string" },
        platforms: { type: "array", items: { type: "string" } },
        pillars: { type: "array", items: { type: "string" } },
        publish_date: { type: "string" },
        live_url: { type: "string" },
        trust_check: { type: "string" },
        hold: { type: "boolean" },
        goal_id: { type: "string" },
        review_notes: { type: "string" },
        retro: { type: "string" },
      },
      required: ["id"],
    },
    handler: async (args: any) => {
      const upd: Record<string, unknown> = {};
      for (const k of ["title", "body", "status", "publish_date", "live_url", "trust_check", "goal_id", "review_notes", "retro"]) {
        if (args[k] !== undefined) upd[k] = args[k] === "" ? null : args[k];
      }
      if (args.hold !== undefined) upd.hold = args.hold;
      const platforms = asArray(args.platforms);
      if (platforms !== undefined) upd.platforms = platforms.filter((p) => (PLATFORMS as readonly string[]).includes(p));
      const pillars = asArray(args.pillars);
      if (pillars !== undefined) upd.pillars = pillars;

      const { data, error } = await supabase
        .from("social_posts").update(upd).eq("id", args.id).eq("user_id", userId).select().single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `✅ Updated "${data.title}"` }] };
    },
  });

  mcp.tool("delete_social_post", {
    description: "Delete a social post (and all its metric snapshots).",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    handler: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("social_posts").delete().eq("id", id).eq("user_id", userId);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: "🗑️ Post deleted" }] };
    },
  });

  // ── Metrics ──────────────────────────────────────────
  mcp.tool("log_social_metrics", {
    description:
      "Upsert a metrics snapshot for one post on one platform on one date. Unique on (post_id, metrics_as_of, platform) — re-runs overwrite. Engagement rate is computed automatically.",
    inputSchema: {
      type: "object",
      properties: {
        post_id: { type: "string" },
        platform: { type: "string", description: `One of: ${PLATFORMS.join(", ")}` },
        metrics_as_of: { type: "string", description: "YYYY-MM-DD" },
        impressions: { type: "number" },
        reactions: { type: "number" },
        comments: { type: "number" },
        reposts: { type: "number" },
        reach: { type: "number" },
        profile_views: { type: "number" },
        followers_gained: { type: "number" },
        saves: { type: "number" },
        sends: { type: "number" },
        link_clicks: { type: "number" },
      },
      required: ["post_id", "platform", "metrics_as_of"],
    },
    handler: async (args: any) => {
      if (!(PLATFORMS as readonly string[]).includes(args.platform)) {
        return { content: [{ type: "text" as const, text: `platform must be one of: ${PLATFORMS.join(", ")}` }] };
      }
      const insert: Record<string, unknown> = { user_id: userId };
      for (const k of ["post_id", "platform", "metrics_as_of", "impressions", "reactions", "comments", "reposts", "reach", "profile_views", "followers_gained", "saves", "sends", "link_clicks"]) {
        if (args[k] !== undefined) insert[k] = args[k];
      }
      const { data, error } = await supabase
        .from("social_post_metrics")
        .upsert(insert, { onConflict: "post_id,metrics_as_of,platform" })
        .select()
        .single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return {
        content: [{ type: "text" as const, text: `✅ Snapshot saved (ER ${data.engagement_rate ? (Number(data.engagement_rate) * 100).toFixed(2) + "%" : "—"})` }],
      };
    },
  });

  // ── Follower growth ──────────────────────────────────
  mcp.tool("log_follower_count", {
    description:
      "Upsert account-level follower total for a platform on a date. Trigger computes `net_new` vs the previous entry for that platform automatically.",
    inputSchema: {
      type: "object",
      properties: {
        platform: { type: "string", description: `One of: ${PLATFORMS.join(", ")}` },
        date: { type: "string", description: "YYYY-MM-DD" },
        total_followers: { type: "number" },
        note: { type: "string" },
      },
      required: ["platform", "date", "total_followers"],
    },
    handler: async (args: any) => {
      const { data, error } = await supabase
        .from("social_follower_growth")
        .upsert({ user_id: userId, ...args }, { onConflict: "user_id,platform,date" })
        .select()
        .single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      // Cache on settings
      await supabase.from("social_platform_settings").upsert(
        { user_id: userId, platform: args.platform, current_followers_cached: args.total_followers },
        { onConflict: "user_id,platform" },
      );
      return { content: [{ type: "text" as const, text: `✅ ${data.total_followers} followers on ${data.platform} (${data.date}); net_new=${data.net_new ?? "—"}` }] };
    },
  });

  mcp.tool("get_follower_growth", {
    description:
      "Return follower growth series for a platform plus pace vs the configured target (from social_platform_settings).",
    inputSchema: {
      type: "object",
      properties: { platform: { type: "string", description: `One of: ${PLATFORMS.join(", ")}` } },
      required: ["platform"],
    },
    handler: async ({ platform }: { platform: string }) => {
      const [{ data: series }, { data: setting }] = await Promise.all([
        supabase.from("social_follower_growth").select("*").eq("user_id", userId).eq("platform", platform).order("date"),
        supabase.from("social_platform_settings").select("*").eq("user_id", userId).eq("platform", platform).maybeSingle(),
      ]);
      const current = (series && series.length > 0) ? series[series.length - 1].total_followers : null;
      const target = setting?.follower_target ?? null;
      const deadline = setting?.target_deadline ?? null;
      let pace: any = { status: "no_target" };
      if (current != null && target != null && deadline != null) {
        const days = Math.max(1, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000));
        const perDayNeeded = (target - current) / days;
        const thirty = Date.now() - 30 * 86_400_000;
        const older = (series ?? []).filter((g: any) => new Date(g.date).getTime() <= thirty);
        const baseline = older.length > 0 ? older[older.length - 1].total_followers : series![0].total_followers;
        const netNew30 = current - baseline;
        const perDayActual = netNew30 / 30;
        let status = "behind";
        if (current >= target) status = "complete";
        else if (perDayActual >= perDayNeeded * 1.1) status = "ahead";
        else if (perDayActual >= perDayNeeded * 0.9) status = "on_track";
        pace = { current, target, deadline, days_to_deadline: days, per_day_needed: perDayNeeded, per_day_actual: perDayActual, net_new_30d: netNew30, status };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ series: series ?? [], pace }, null, 2) }] };
    },
  });

  // ── Analytics roll-up ────────────────────────────────
  mcp.tool("get_social_analytics", {
    description:
      "Aggregate post performance: top posts by engagement rate (overall and per pillar/platform), latest snapshot per post.",
    inputSchema: {
      type: "object",
      properties: {
        platform: { type: "string" },
        from_date: { type: "string" },
        to_date: { type: "string" },
      },
    },
    handler: async (args: any) => {
      const { data: latest } = await supabase
        .from("social_post_latest_metrics").select("*").eq("user_id", userId);
      const { data: posts } = await supabase
        .from("social_posts").select("id,title,platforms,pillars,publish_date,status").eq("user_id", userId);
      const postMap = new Map((posts ?? []).map((p: any) => [p.id, p]));
      let rows = (latest ?? []).map((m: any) => ({ ...m, post: postMap.get(m.post_id) }))
        .filter((r) => r.post);
      if (args.platform) rows = rows.filter((r) => r.platform === args.platform);
      if (args.from_date) rows = rows.filter((r) => r.metrics_as_of >= args.from_date);
      if (args.to_date) rows = rows.filter((r) => r.metrics_as_of <= args.to_date);
      const top = [...rows].sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0)).slice(0, 20);
      const byPillar: Record<string, { count: number; total_er: number }> = {};
      for (const r of rows) {
        for (const p of (r.post?.pillars ?? [])) {
          byPillar[p] ??= { count: 0, total_er: 0 };
          byPillar[p].count += 1;
          byPillar[p].total_er += Number(r.engagement_rate ?? 0);
        }
      }
      const pillar_avg = Object.entries(byPillar)
        .map(([pillar, v]) => ({ pillar, avg_engagement_rate: v.total_er / v.count, posts: v.count }))
        .sort((a, b) => b.avg_engagement_rate - a.avg_engagement_rate);
      return { content: [{ type: "text" as const, text: JSON.stringify({ top_posts: top, pillar_avg }, null, 2) }] };
    },
  });

  // ── Platform settings (incl. targets) ────────────────
  mcp.tool("get_social_platform_settings", {
    description: "List per-platform settings: enabled flag, follower_target, target_deadline, pillars, current_followers_cached. Targets are user-set, never hardcoded.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const { data, error } = await supabase
        .from("social_platform_settings").select("*").eq("user_id", userId).order("platform");
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  });

  mcp.tool("update_social_platform_settings", {
    description: "Upsert settings for one platform. Pass any subset of fields.",
    inputSchema: {
      type: "object",
      properties: {
        platform: { type: "string", description: `One of: ${PLATFORMS.join(", ")}` },
        enabled: { type: "boolean" },
        follower_target: { type: "number" },
        target_deadline: { type: "string", description: "YYYY-MM-DD" },
        pillars: { type: "array", items: { type: "string" } },
        notes: { type: "string" },
      },
      required: ["platform"],
    },
    handler: async (args: any) => {
      const payload: Record<string, unknown> = { user_id: userId, platform: args.platform };
      for (const k of ["enabled", "follower_target", "target_deadline", "pillars", "notes"]) {
        if (args[k] !== undefined) payload[k] = args[k];
      }
      const { data, error } = await supabase
        .from("social_platform_settings")
        .upsert(payload, { onConflict: "user_id,platform" })
        .select()
        .single();
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: "text" as const, text: `✅ Updated ${data.platform} settings` }] };
    },
  });

  // ── Social handles (profile URLs) ────────────────────
  mcp.tool("get_social_handles", {
    description:
      "Return the user's saved social account URLs/handles (LinkedIn, X/Twitter, Instagram, TikTok, YouTube) from their profile, alongside which platforms are tracked in the Social module and current follower counts. Use this to discover which accounts/handles to pull metrics for before calling external scrapers/APIs.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const [{ data: profile, error: pErr }, { data: settings }] = await Promise.all([
        supabase
          .from("profiles")
          .select("linkedin_url, twitter_url, instagram_url, tiktok_url, youtube_url")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("social_platform_settings")
          .select("platform, enabled, follower_target, target_deadline, current_followers_cached")
          .eq("user_id", userId),
      ]);
      if (pErr) return { content: [{ type: "text" as const, text: `Error: ${pErr.message}` }] };

      const settingsByPlatform = new Map((settings ?? []).map((s: any) => [s.platform, s]));
      const extractHandle = (url: string | null | undefined, platform: string): string | null => {
        if (!url) return null;
        try {
          const u = new URL(url.startsWith("http") ? url : `https://${url}`);
          const path = u.pathname.replace(/^\/+|\/+$/g, "");
          if (platform === "linkedin") {
            const m = path.match(/^in\/([^/]+)/i) ?? path.match(/^company\/([^/]+)/i);
            return m ? m[1] : path || null;
          }
          if (platform === "youtube") {
            const m = path.match(/^(@[^/]+)/) ?? path.match(/^(c|channel|user)\/([^/]+)/);
            return m ? (m[2] ?? m[1]) : path || null;
          }
          // x, instagram, tiktok: first path segment
          const seg = path.split("/")[0] ?? "";
          return seg ? seg.replace(/^@/, "") : null;
        } catch {
          return null;
        }
      };

      const fields: Array<{ platform: string; field: string; url: string | null | undefined }> = [
        { platform: "linkedin", field: "linkedin_url", url: profile?.linkedin_url },
        { platform: "x", field: "twitter_url", url: profile?.twitter_url },
        { platform: "instagram", field: "instagram_url", url: profile?.instagram_url },
        { platform: "tiktok", field: "tiktok_url", url: profile?.tiktok_url },
        { platform: "youtube", field: "youtube_url", url: profile?.youtube_url },
      ];

      const handles = fields
        .filter((f) => f.url && String(f.url).trim())
        .map((f) => {
          const s: any = settingsByPlatform.get(f.platform);
          return {
            platform: f.platform,
            url: f.url,
            handle: extractHandle(f.url, f.platform),
            tracked_in_social_module: !!s?.enabled,
            current_followers_cached: s?.current_followers_cached ?? null,
            follower_target: s?.follower_target ?? null,
            target_deadline: s?.target_deadline ?? null,
          };
        });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            handles,
            note: "Use `handle` or `url` with an external scraper/API to fetch live metrics, then feed results back via `log_social_metrics` (per post) or `log_follower_count` (account-level).",
          }, null, 2),
        }],
      };
    },
  });
}

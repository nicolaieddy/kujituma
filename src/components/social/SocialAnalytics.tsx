import { useMemo, useState } from "react";
import { format, subDays, startOfYear, startOfWeek, startOfMonth } from "date-fns";
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TrendingUp, TrendingDown, Minus, CalendarIcon, X, Info, Database } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  PLATFORM_META, SOCIAL_PLATFORMS, formatCompact, formatEngagementRate, paddedYDomain,
  MEDIA_TYPE_META, MEDIA_FOCUS_META,
  type SocialPlatform, type SocialMediaType, type SocialMediaFocus,
} from "@/lib/social";
import { useSocialPlatformSettings } from "@/hooks/useSocialPlatformSettings";
import { useFollowerGrowth } from "@/hooks/useFollowerGrowth";
import { useDailyAccountMetrics } from "@/hooks/useDailyAccountMetrics";
import { useSocialPosts } from "@/hooks/useSocialPosts";
import { useLatestMetricsByPost } from "@/hooks/useSocialMetrics";
import { useSocialGoals } from "@/hooks/useSocialGoals";
import { useShowGoalLine } from "@/hooks/useShowGoalLine";
import { CompactNumber } from "./CompactNumber";
import { AnalyticsGoalsSection } from "./AnalyticsGoalsSection";
import type { DateRange } from "react-day-picker";

type PresetKey = "7d" | "30d" | "90d" | "ytd" | "custom";
type PlatformFilter = "all" | SocialPlatform;
type Bucket = "day" | "week" | "month";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "ytd", label: "YTD" },
  { key: "custom", label: "Custom" },
];

function rangeFromPreset(preset: PresetKey, custom?: DateRange): { from: Date; to: Date } {
  const to = new Date();
  if (preset === "custom" && custom?.from) {
    return { from: custom.from, to: custom.to ?? to };
  }
  switch (preset) {
    case "7d":  return { from: subDays(to, 7),  to };
    case "30d": return { from: subDays(to, 30), to };
    case "90d": return { from: subDays(to, 90), to };
    case "ytd": return { from: startOfYear(to), to };
    default:    return { from: subDays(to, 30), to };
  }
}

function bucketForRange(days: number): Bucket {
  if (days <= 31) return "day";
  if (days <= 120) return "week";
  return "month";
}

function bucketKey(iso: string, bucket: Bucket): string {
  const d = new Date(iso);
  if (bucket === "day") return iso.slice(0, 10);
  if (bucket === "week") return startOfWeek(d, { weekStartsOn: 1 }).toISOString().slice(0, 10);
  return startOfMonth(d).toISOString().slice(0, 10);
}

function inRange(iso: string, from: Date, to: Date) {
  const t = new Date(iso).getTime();
  return t >= from.setHours(0,0,0,0) && t <= to.setHours(23,59,59,999);
}

export function SocialAnalytics() {
  const { data: settings = [] } = useSocialPlatformSettings();
  const { data: growth = [] } = useFollowerGrowth();
  const { data: dailyMetrics = [] } = useDailyAccountMetrics();
  const { data: posts = [] } = useSocialPosts();
  const { data: latest = {} } = useLatestMetricsByPost();
  const { data: goals = [] } = useSocialGoals();
  const [showGoalLine, setShowGoalLine] = useShowGoalLine();

  const [preset, setPreset] = useState<PresetKey>("30d");
  const [custom, setCustom] = useState<DateRange | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");

  const enabled = settings.filter((s) => s.enabled).map((s) => s.platform);
  const enabledPlatforms: SocialPlatform[] = useMemo(() => {
    // Include any platform that has data, even if not "enabled" in settings, so users see history.
    const set = new Set<SocialPlatform>(enabled);
    for (const g of growth) set.add(g.platform);
    for (const m of dailyMetrics) set.add(m.platform);
    return SOCIAL_PLATFORMS.filter((p) => set.has(p));
  }, [enabled, growth, dailyMetrics]);

  const visiblePlatforms = platformFilter === "all" ? enabledPlatforms : [platformFilter];

  const { from, to } = rangeFromPreset(preset, custom);
  const days = Math.max(1, Math.round((+to - +from) / 86_400_000));
  const bucket = bucketForRange(days);

  // ───────── Followers stacked series ─────────
  const followerSeries = useMemo(() => {
    // Carry-forward last known value per platform across periods.
    const perPlatform: Record<string, Map<string, number>> = {};
    for (const g of growth) {
      if (!visiblePlatforms.includes(g.platform)) continue;
      const k = bucketKey(g.date, bucket);
      perPlatform[g.platform] ??= new Map();
      // last write wins → keep latest in period
      perPlatform[g.platform].set(k, g.total_followers);
    }
    const allKeys = new Set<string>();
    for (const p of Object.keys(perPlatform)) for (const k of perPlatform[p].keys()) allKeys.add(k);
    // Only keys within range
    const keys = Array.from(allKeys).filter((k) => inRange(k, new Date(from), new Date(to))).sort();
    const lastSeen: Record<string, number> = {};
    return keys.map((k) => {
      const row: Record<string, any> = { period: k };
      let total = 0;
      for (const p of visiblePlatforms) {
        const v = perPlatform[p]?.get(k);
        if (v != null) lastSeen[p] = v;
        const val = lastSeen[p] ?? 0;
        row[p] = val;
        total += val;
      }
      row.__total = total;
      // Goal projection lines
      const periodMs = new Date(k).getTime();
      for (const g of goals) {
        if (g.status !== "active" || g.metric !== "followers") continue;
        if (!visiblePlatforms.includes(g.platform)) continue;
        const s = new Date(g.start_date).getTime();
        const e = new Date(g.target_date).getTime();
        if (periodMs < s || periodMs > e || e === s) continue;
        const pct = (periodMs - s) / (e - s);
        row[`goal_${g.id}`] = Math.round(g.start_value + pct * (g.target_value - g.start_value));
      }
      return row;
    });
  }, [growth, visiblePlatforms, bucket, from, to, goals]);

  // ───────── Impressions stacked series ─────────
  const impressionsSeries = useMemo(() => {
    const perPlatform: Record<string, Map<string, number>> = {};
    for (const m of dailyMetrics) {
      if (!visiblePlatforms.includes(m.platform)) continue;
      if (!inRange(m.date, new Date(from), new Date(to))) continue;
      const k = bucketKey(m.date, bucket);
      perPlatform[m.platform] ??= new Map();
      const prev = perPlatform[m.platform].get(k) ?? 0;
      perPlatform[m.platform].set(k, prev + (m.impressions ?? 0));
    }
    const keys = new Set<string>();
    for (const p of Object.keys(perPlatform)) for (const k of perPlatform[p].keys()) keys.add(k);
    return Array.from(keys).sort().map((k) => {
      const row: Record<string, any> = { period: k };
      let total = 0;
      for (const p of visiblePlatforms) {
        const v = perPlatform[p]?.get(k) ?? 0;
        row[p] = v;
        total += v;
      }
      row.__total = total;
      return row;
    });
  }, [dailyMetrics, visiblePlatforms, bucket, from, to]);

  // Which visible platforms have zero impressions data this period?
  const platformsMissingImpressions = useMemo(() => {
    const has: Record<string, boolean> = {};
    for (const m of dailyMetrics) {
      if (!inRange(m.date, new Date(from), new Date(to))) continue;
      if ((m.impressions ?? 0) > 0) has[m.platform] = true;
    }
    return visiblePlatforms.filter((p) => !has[p]);
  }, [dailyMetrics, visiblePlatforms, from, to]);

  // ───────── KPIs ─────────
  const kpis = useMemo(() => {
    const last = followerSeries[followerSeries.length - 1];
    const first = followerSeries[0];
    const totalFollowers = last?.__total ?? 0;
    const followersDelta = (last?.__total ?? 0) - (first?.__total ?? 0);

    let totalImpr = 0;
    let totalEng = 0;
    for (const m of dailyMetrics) {
      if (!visiblePlatforms.includes(m.platform)) continue;
      if (!inRange(m.date, new Date(from), new Date(to))) continue;
      totalImpr += m.impressions ?? 0;
      totalEng += m.engagements ?? 0;
    }
    const engRate = totalImpr > 0 ? totalEng / totalImpr : null;

    const postsInRangeList = posts.filter((p) =>
      p.status === "published" && p.publish_date &&
      inRange(p.publish_date, new Date(from), new Date(to)) &&
      (platformFilter === "all" || (p.platforms ?? []).includes(platformFilter)),
    );
    const postsInRange = postsInRangeList.length;

    // Coverage: what % of account impressions in the range is explained
    // by the tracked posts published in that range. Uses the latest
    // cumulative snapshot per tracked post (MAX per post — never SUM
    // across snapshots — so we don't double-count deltas).
    let trackedImpr = 0;
    let postsWithMetrics = 0;
    for (const p of postsInRangeList) {
      const m = latest[p.id];
      if (m && (m.impressions ?? 0) > 0) {
        if (platformFilter === "all" || m.platform === platformFilter) {
          trackedImpr += m.impressions ?? 0;
          postsWithMetrics += 1;
        }
      }
    }
    const coverage = totalImpr > 0 ? trackedImpr / totalImpr : null;

    return { totalFollowers, followersDelta, totalImpr, totalEng, engRate, postsInRange, trackedImpr, postsWithMetrics, coverage };
  }, [followerSeries, dailyMetrics, visiblePlatforms, from, to, posts, platformFilter, latest]);

  // ───────── Per-platform breakdown rows ─────────
  const breakdown = useMemo(() => {
    return enabledPlatforms.map((p) => {
      const g = growth.filter((x) => x.platform === p);
      const inWindow = g.filter((x) => inRange(x.date, new Date(from), new Date(to)));
      const before = g.filter((x) => new Date(x.date) <= from).pop();
      const latestRow = (inWindow[inWindow.length - 1] ?? g[g.length - 1]);
      const baseFollowers = before?.total_followers ?? inWindow[0]?.total_followers ?? null;
      const nowFollowers = latestRow?.total_followers ?? baseFollowers;
      const dFollowers = nowFollowers != null && baseFollowers != null ? nowFollowers - baseFollowers : 0;

      let impr = 0, eng = 0;
      for (const m of dailyMetrics) {
        if (m.platform !== p) continue;
        if (!inRange(m.date, new Date(from), new Date(to))) continue;
        impr += m.impressions ?? 0;
        eng += m.engagements ?? 0;
      }
      const postsCount = posts.filter((post) =>
        post.status === "published" && post.publish_date &&
        inRange(post.publish_date, new Date(from), new Date(to)) &&
        (post.platforms ?? []).includes(p),
      ).length;
      return {
        platform: p,
        followers: nowFollowers,
        dFollowers,
        impressions: impr,
        engagements: eng,
        engRate: impr > 0 ? eng / impr : null,
        posts: postsCount,
      };
    });
  }, [enabledPlatforms, growth, dailyMetrics, posts, from, to]);

  // ───────── Top posts ─────────
  const topPosts = useMemo(() => {
    return posts
      .filter((p) => platformFilter === "all" || (p.platforms ?? []).includes(platformFilter))
      .filter((p) => !p.publish_date || inRange(p.publish_date, new Date(from), new Date(to)))
      .map((p) => ({ post: p, metric: latest[p.id] }))
      .filter((x) => x.metric && (x.metric.engagement_rate ?? 0) > 0)
      .sort((a, b) => (b.metric!.engagement_rate ?? 0) - (a.metric!.engagement_rate ?? 0))
      .slice(0, 10);
  }, [posts, latest, platformFilter, from, to]);

  const rangeLabel = `${format(from, "d MMM")} – ${format(to, "d MMM yyyy")}`;
  const activeFollowerGoals = goals.filter((g) =>
    g.status === "active" && g.metric === "followers" && visiblePlatforms.includes(g.platform),
  );

  // ───────── Media type / focus breakdown ─────────
  // For each media_type / media_focus value we roll up the LATEST cumulative
  // snapshot per post — never sum across snapshots, so deltas aren't double-counted.
  const mediaBreakdown = useMemo(() => {
    const build = <K extends "media_type" | "media_focus">(key: K) => {
      const acc = new Map<string, { posts: number; impressions: number; reach: number; er_sum: number; er_count: number }>();
      for (const p of posts) {
        if (p.status !== "published" || !p.publish_date) continue;
        if (!inRange(p.publish_date, new Date(from), new Date(to))) continue;
        if (platformFilter !== "all" && !(p.platforms ?? []).includes(platformFilter)) continue;
        const raw = (p as any)[key];
        if (!raw) continue;
        const m = latest[p.id];
        if (!m) continue;
        if (platformFilter !== "all" && m.platform !== platformFilter) continue;
        const bucket = acc.get(raw) ?? { posts: 0, impressions: 0, reach: 0, er_sum: 0, er_count: 0 };
        bucket.posts += 1;
        bucket.impressions += m.impressions ?? 0;
        bucket.reach += m.reach ?? 0;
        if (m.engagement_rate != null) { bucket.er_sum += m.engagement_rate; bucket.er_count += 1; }
        acc.set(raw, bucket);
      }
      return Array.from(acc.entries()).map(([k, v]) => ({
        key: k,
        posts: v.posts,
        impressions: v.impressions,
        reach: v.reach,
        avg_engagement_rate: v.er_count > 0 ? v.er_sum / v.er_count : null,
      }));
    };
    return { media_type: build("media_type"), media_focus: build("media_focus") };
  }, [posts, latest, from, to, platformFilter]);


  return (
    <div className="space-y-6">
      {/* ───── Period + Platform filter ───── */}
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => { setPreset(p.key); if (p.key === "custom") setPickerOpen(true); }}
              className={cn(
                "px-3 py-1 text-xs rounded-sm font-medium transition-colors",
                preset === p.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
          <Popover open={pickerOpen} onOpenChange={(o) => { setPickerOpen(o); if (o) setPreset("custom"); }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "px-2 py-1 text-xs rounded-sm transition-colors flex items-center gap-1",
                  preset === "custom" && custom?.from ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <CalendarIcon className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="range"
                selected={custom}
                onSelect={(r) => { setCustom(r); setPreset("custom"); }}
                numberOfMonths={2}
                initialFocus
                className="p-3 pointer-events-auto"
              />
              <div className="flex items-center justify-between border-t p-2">
                <Button size="sm" variant="ghost" onClick={() => setCustom(undefined)} className="gap-1.5" disabled={!custom?.from}>
                  <X className="h-3 w-3" /> Clear
                </Button>
                <Button size="sm" onClick={() => setPickerOpen(false)}>Done</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="text-xs text-muted-foreground tabular-nums">{rangeLabel}</div>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <PlatformChip active={platformFilter === "all"} onClick={() => setPlatformFilter("all")}>
            All
          </PlatformChip>
          {enabledPlatforms.map((p) => {
            const Icon = PLATFORM_META[p].icon;
            return (
              <PlatformChip key={p} active={platformFilter === p} onClick={() => setPlatformFilter(p)}>
                <Icon className={cn("h-3 w-3", PLATFORM_META[p].color)} />
                {PLATFORM_META[p].label}
              </PlatformChip>
            );
          })}
        </div>
      </Card>

      {/* ───── KPI strip ───── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Total followers"
          value={<CompactNumber value={kpis.totalFollowers} />}
          delta={kpis.followersDelta}
          sub={kpis.followersDelta !== 0 ? `${kpis.followersDelta > 0 ? "+" : ""}${kpis.followersDelta.toLocaleString()} in range` : "no change in range"}
          source="social_follower_growth"
          sourceDetail="Latest total in range minus value at range start. Sourced from logged counts and aggregate-export anchors."
        />
        <KpiCard
          label="Total impressions"
          value={<CompactNumber value={kpis.totalImpr} />}
          sub={`across ${visiblePlatforms.length} platform${visiblePlatforms.length === 1 ? "" : "s"}`}
          source="social_daily_account_metrics"
          sourceDetail="Sum of daily impressions in range. Imported from LinkedIn aggregate analytics (deduped per day)."
        />
        <KpiCard
          label="Engagement rate"
          value={kpis.engRate != null ? formatEngagementRate(kpis.engRate) : "—"}
          sub={`${kpis.totalEng.toLocaleString()} engagements`}
          source="social_daily_account_metrics"
          sourceDetail="Engagements ÷ impressions over the selected range. Both come from imported aggregate analytics."
        />
        <KpiCard
          label="Posts published"
          value={kpis.postsInRange.toString()}
          sub="in range"
          source="social_posts"
          sourceDetail="Count of posts with status = published and publish_date in the selected range."
        />
        <KpiCard
          label="Tracked-post coverage"
          value={kpis.coverage != null ? `${Math.round(kpis.coverage * 100)}%` : "—"}
          sub={
            kpis.coverage != null
              ? `${formatCompact(kpis.trackedImpr)} of ${formatCompact(kpis.totalImpr)} · ${kpis.postsWithMetrics}/${kpis.postsInRange} posts with metrics`
              : kpis.totalImpr === 0
                ? "no account impressions in range"
                : `${kpis.postsWithMetrics}/${kpis.postsInRange} posts with metrics`
          }
          source="social_post_metrics ÷ social_daily_account_metrics"
          sourceDetail="Sum of the latest cumulative impressions on posts published in range, divided by total account impressions in range. Uses MAX per post — never SUM across snapshots — so deltas aren't double-counted. Coverage over 100% means account totals lag behind per-post totals (import newer aggregate data)."
        />
      </div>

      {/* ───── Followers stacked area ───── */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Followers over time</h3>
            <p className="text-xs text-muted-foreground">Stacked by platform · total = top of stack</p>
          </div>
          {activeFollowerGoals.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Switch id="show-goal-line" checked={showGoalLine} onCheckedChange={setShowGoalLine} />
              <Label htmlFor="show-goal-line" className="text-xs text-muted-foreground cursor-pointer">Goal line</Label>
            </div>
          )}
        </div>
        {followerSeries.length === 0 ? (
          <EmptyState text="No follower history in this range. Log counts in Setup or import an aggregate export." />
        ) : (() => {
          // Compute the true total min/max across visible platforms per period, because
          // Recharts' stacked-area dataMin is always 0 (the stack baseline) and would
          // otherwise prevent any "zoom in" on a near-flat trend.
          let totalMin = Infinity;
          let totalMax = -Infinity;
          for (const row of followerSeries) {
            let sum = 0;
            for (const p of visiblePlatforms) sum += Number((row as any)[p] ?? 0);
            // Include goal pace so the dashed line never escapes the plot.
            if (showGoalLine) {
              for (const g of activeFollowerGoals) {
                const gv = Number((row as any)[`goal_${g.id}`]);
                if (Number.isFinite(gv)) {
                  if (gv < totalMin) totalMin = gv;
                  if (gv > totalMax) totalMax = gv;
                }
              }
            }
            if (sum < totalMin) totalMin = sum;
            if (sum > totalMax) totalMax = sum;
          }
          if (!Number.isFinite(totalMin) || !Number.isFinite(totalMax)) {
            totalMin = 0; totalMax = 1;
          }
          const [yMin, yMax] = paddedYDomain([totalMin, totalMax], { minPad: 1, zeroFloor: false });
          // When only one platform is visible we can drop the stack and start the area
          // fill from the bottom of the chart (baseValue="dataMin"), so the visible
          // band actually reflects the y-axis range instead of flooding from zero.
          const singlePlatform = visiblePlatforms.length === 1;
          return (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={followerSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="period" tickFormatter={(v) => format(new Date(v), bucket === "month" ? "MMM yy" : "d MMM")} tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => formatCompact(Number(v))}
                  tick={{ fontSize: 11 }}
                  domain={[yMin, yMax]}
                  allowDataOverflow={false}
                />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  labelFormatter={(l) => format(new Date(l as string), bucket === "month" ? "MMMM yyyy" : bucket === "week" ? "'Week of' d MMM" : "d MMM yyyy")}
                  formatter={(value: number, name: string) => {
                    if (typeof name === "string" && name.startsWith("goal_")) {
                      const g = activeFollowerGoals.find((x) => x.id === name.slice(5));
                      return [value.toLocaleString(), g ? `${PLATFORM_META[g.platform].label} goal` : "Goal"];
                    }
                    return [value.toLocaleString(), PLATFORM_META[name as SocialPlatform]?.label ?? name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={(n) => {
                  if (typeof n === "string" && n.startsWith("goal_")) {
                    const g = activeFollowerGoals.find((x) => x.id === n.slice(5));
                    return g ? `${PLATFORM_META[g.platform].label} goal pace` : "Goal pace";
                  }
                  return PLATFORM_META[n as SocialPlatform]?.label ?? n;
                }} />
                {visiblePlatforms.map((p) => (
                  <Area
                    key={p}
                    type="monotone"
                    dataKey={p}
                    {...(singlePlatform ? { baseValue: "dataMin" as const } : { stackId: "f" })}
                    stroke={PLATFORM_META[p].hex}
                    fill={PLATFORM_META[p].hex}
                    fillOpacity={0.65}
                  />
                ))}
                {showGoalLine && activeFollowerGoals.map((g) => (
                  <Line key={g.id} type="linear" dataKey={`goal_${g.id}`} stroke={PLATFORM_META[g.platform].hex} strokeDasharray="5 4" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          );
        })()}
      </Card>

      {/* ───── Impressions stacked area ───── */}
      <Card className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold">Impressions over time</h3>
          <p className="text-xs text-muted-foreground">From imported account-level analytics</p>
        </div>
        {impressionsSeries.length === 0 ? (
          <EmptyState text="No impressions data in this range. Use Import aggregate analytics on the Setup tab." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={impressionsSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="period" tickFormatter={(v) => format(new Date(v), bucket === "month" ? "MMM yy" : "d MMM")} tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => formatCompact(Number(v))}
                  tick={{ fontSize: 11 }}
                  domain={([dataMin, dataMax]: [number, number]) =>
                    paddedYDomain([dataMin, dataMax], { minPad: 1, zeroFloor: true })
                  }
                  allowDataOverflow={false}
                />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  labelFormatter={(l) => format(new Date(l as string), bucket === "month" ? "MMMM yyyy" : bucket === "week" ? "'Week of' d MMM" : "d MMM yyyy")}
                  formatter={(value: number, name: string) => [value.toLocaleString(), PLATFORM_META[name as SocialPlatform]?.label ?? name]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={(n) => PLATFORM_META[n as SocialPlatform]?.label ?? n} />
                {visiblePlatforms.map((p) => (
                  <Area key={p} type="monotone" dataKey={p} stackId="i" stroke={PLATFORM_META[p].hex} fill={PLATFORM_META[p].hex} fillOpacity={0.55} />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        {platformsMissingImpressions.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/30 p-2 text-[11px] text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div>
              <strong className="text-foreground">No impressions data for </strong>
              {platformsMissingImpressions.map((p) => PLATFORM_META[p].label).join(", ")}
              {" in this range — those bands show as zero. Import aggregate analytics on the Setup tab to fill them in."}
            </div>
          </div>
        )}
      </Card>

      {/* ───── Per-platform breakdown ───── */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Platform breakdown</h3>
        {breakdown.length === 0 ? (
          <EmptyState text="Enable a platform in Setup to see breakdown." />
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                  <th className="text-left font-medium px-4 py-2">Platform</th>
                  <th className="text-right font-medium px-2 py-2">Followers</th>
                  <th className="text-right font-medium px-2 py-2">Δ</th>
                  <th className="text-right font-medium px-2 py-2">Impressions</th>
                  <th className="text-right font-medium px-2 py-2">Engagements</th>
                  <th className="text-right font-medium px-2 py-2">Eng. rate</th>
                  <th className="text-right font-medium px-4 py-2">Posts</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((r) => {
                  const Icon = PLATFORM_META[r.platform].icon;
                  return (
                    <tr key={r.platform} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => setPlatformFilter(r.platform)}
                          className="flex items-center gap-2 hover:text-primary"
                        >
                          <Icon className={cn("h-4 w-4", PLATFORM_META[r.platform].color)} />
                          <span className="font-medium">{PLATFORM_META[r.platform].label}</span>
                        </button>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums"><CompactNumber value={r.followers} /></td>
                      <td className={cn("px-2 py-2 text-right tabular-nums text-xs", r.dFollowers > 0 ? "text-emerald-600" : r.dFollowers < 0 ? "text-destructive" : "text-muted-foreground")}>
                        {r.dFollowers > 0 ? "+" : ""}{r.dFollowers.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.impressions > 0 ? <CompactNumber value={r.impressions} /> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.engagements > 0 ? <CompactNumber value={r.engagements} /> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.engRate != null ? formatEngagementRate(r.engRate) : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.posts || <span className="text-muted-foreground">0</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ───── Media type / focus breakdown ───── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <MediaBreakdownCard
          title="Media type"
          subtitle="Photo · Video · Carousel · Graphic"
          rows={mediaBreakdown.media_type}
          labelFor={(k) => MEDIA_TYPE_META[k as SocialMediaType]?.label ?? k}
          emptyText="Tag posts with a media type in the editor to see this ranking."
        />
        <MediaBreakdownCard
          title="Media focus"
          subtitle="Me · Flyer · Product · Team · Other"
          rows={mediaBreakdown.media_focus}
          labelFor={(k) => MEDIA_FOCUS_META[k as SocialMediaFocus]?.label ?? k}
          emptyText="Tag posts with a media focus in the editor to see this ranking."
        />
      </div>

      {/* ───── Goals progress ───── */}
      <AnalyticsGoalsSection />

      {/* ───── Top posts ───── */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Top posts by engagement rate</h3>
        {topPosts.length === 0 ? (
          <EmptyState text="No posts with metrics in this range." />
        ) : (
          <div className="divide-y divide-border">
            {topPosts.map(({ post, metric }) => {
              const Icon = PLATFORM_META[metric!.platform].icon;
              return (
                <div key={post.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{post.title || "Untitled"}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Icon className={cn("h-3 w-3", PLATFORM_META[metric!.platform].color)} />
                      {format(new Date(metric!.metrics_as_of), "d MMM yyyy")}
                      {metric!.impressions != null && <span>· <CompactNumber value={metric!.impressions} /> impressions</span>}
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="font-semibold">{formatEngagementRate(metric!.engagement_rate)}</div>
                    {metric!.followers_gained != null && metric!.followers_gained > 0 && (
                      <div className="text-[11px] text-emerald-600">+{metric!.followers_gained} followers</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function PlatformChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30",
      )}
    >
      {children}
    </button>
  );
}

function KpiCard({ label, value, sub, delta, source, sourceDetail }: { label: string; value: React.ReactNode; sub?: string; delta?: number; source?: string; sourceDetail?: string }) {
  const TrendIcon = delta == null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const trendClass = delta == null || delta === 0 ? "text-muted-foreground" : delta > 0 ? "text-emerald-600" : "text-destructive";
  return (
    <Card className="p-4 space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {sub && (
        <div className={cn("text-[11px] flex items-center gap-1", trendClass)}>
          {delta != null && <TrendIcon className="h-3 w-3" />}
          <span>{sub}</span>
        </div>
      )}
      {source && (
        <TooltipProvider delayDuration={150}>
          <UITooltip>
            <TooltipTrigger asChild>
              <div className="pt-1 flex items-center gap-1 text-[10px] text-muted-foreground/80 cursor-help">
                <Database className="h-2.5 w-2.5" />
                <span className="font-mono truncate">{source}</span>
              </div>
            </TooltipTrigger>
            {sourceDetail && (
              <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                {sourceDetail}
              </TooltipContent>
            )}
          </UITooltip>
        </TooltipProvider>
      )}
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-32 flex items-center justify-center text-sm text-muted-foreground text-center px-4">
      {text}
    </div>
  );
}

type MediaBreakdownRow = {
  key: string;
  posts: number;
  impressions: number;
  reach: number;
  avg_engagement_rate: number | null;
};

type RankMetric = "impressions" | "reach" | "engagement_rate";

function MediaBreakdownCard({
  title,
  subtitle,
  rows,
  labelFor,
  emptyText,
}: {
  title: string;
  subtitle: string;
  rows: MediaBreakdownRow[];
  labelFor: (key: string) => string;
  emptyText: string;
}) {
  const [metric, setMetric] = useState<RankMetric>("impressions");

  const sorted = useMemo(() => {
    const val = (r: MediaBreakdownRow) =>
      metric === "impressions" ? r.impressions
        : metric === "reach" ? r.reach
        : (r.avg_engagement_rate ?? -1);
    return [...rows].sort((a, b) => val(b) - val(a));
  }, [rows, metric]);

  const max = useMemo(() => {
    const val = (r: MediaBreakdownRow) =>
      metric === "impressions" ? r.impressions
        : metric === "reach" ? r.reach
        : (r.avg_engagement_rate ?? 0);
    return Math.max(0, ...sorted.map(val));
  }, [sorted, metric]);

  const tabs: { key: RankMetric; label: string }[] = [
    { key: "impressions", label: "Impressions" },
    { key: "reach", label: "Reach" },
    { key: "engagement_rate", label: "Eng. rate" },
  ];

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setMetric(t.key)}
              className={cn(
                "px-2 py-1 text-[11px] rounded-sm font-medium transition-colors",
                metric === t.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {sorted.length === 0 ? (
        <EmptyState text={emptyText} />
      ) : (
        <ul className="space-y-2">
          {sorted.map((r, i) => {
            const rawValue =
              metric === "impressions" ? r.impressions
                : metric === "reach" ? r.reach
                : (r.avg_engagement_rate ?? 0);
            const pct = max > 0 ? (rawValue / max) * 100 : 0;
            const valueLabel =
              metric === "engagement_rate"
                ? (r.avg_engagement_rate != null ? formatEngagementRate(r.avg_engagement_rate) : "—")
                : (rawValue > 0 ? <CompactNumber value={rawValue} /> : "—");
            return (
              <li key={r.key} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground tabular-nums w-4 text-right">{i + 1}</span>
                    <span className="font-medium truncate">{labelFor(r.key)}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      · {r.posts} post{r.posts === 1 ? "" : "s"}
                    </span>
                  </div>
                  <span className="font-semibold tabular-nums">{valueLabel}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary/80 rounded-full transition-all"
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

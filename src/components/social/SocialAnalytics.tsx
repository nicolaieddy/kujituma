import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, CheckCircle2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { format } from "date-fns";
import {
  PLATFORM_META,
  SOCIAL_PLATFORMS,
  computePace,
  formatCompact,
  formatEngagementRate,
  type SocialPlatform,
} from "@/lib/social";
import { useSocialPlatformSettings } from "@/hooks/useSocialPlatformSettings";
import { useFollowerGrowth } from "@/hooks/useFollowerGrowth";
import { useSocialPosts } from "@/hooks/useSocialPosts";
import { useLatestMetricsByPost } from "@/hooks/useSocialMetrics";
import { cn } from "@/lib/utils";
import { CompactNumber } from "./CompactNumber";

const STATUS_TONE = {
  on_track: { label: "On track", icon: TrendingUp, className: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  ahead:    { label: "Ahead",    icon: TrendingUp, className: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  behind:   { label: "Behind",   icon: TrendingDown, className: "bg-amber-100 text-amber-900 border-amber-200" },
  complete: { label: "Complete", icon: CheckCircle2, className: "bg-primary/15 text-primary border-primary/30" },
  no_target:{ label: "No target",icon: Minus, className: "bg-muted text-muted-foreground border-border" },
} as const;

export function SocialAnalytics() {
  const { data: settings = [] } = useSocialPlatformSettings();
  const { data: allGrowth = [] } = useFollowerGrowth();
  const { data: posts = [] } = useSocialPosts();
  const { data: latest = {} } = useLatestMetricsByPost();

  const enabled = settings.filter((s) => s.enabled);

  const growthByPlatform = useMemo(() => {
    const map: Record<SocialPlatform, typeof allGrowth> = {} as any;
    for (const g of allGrowth) {
      (map[g.platform] ??= [] as any).push(g);
    }
    return map;
  }, [allGrowth]);

  const topPosts = useMemo(() => {
    return posts
      .map((p) => ({ post: p, metric: latest[p.id] }))
      .filter((x) => x.metric && (x.metric.engagement_rate ?? 0) > 0)
      .sort((a, b) => (b.metric!.engagement_rate ?? 0) - (a.metric!.engagement_rate ?? 0))
      .slice(0, 10);
  }, [posts, latest]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {enabled.length === 0 && (
          <Card className="p-6 md:col-span-2 text-sm text-muted-foreground">
            Enable platforms in <strong>Setup</strong> to see follower targets and pace.
          </Card>
        )}

        {enabled.map((s) => {
          const series = growthByPlatform[s.platform] ?? [];
          const current = s.current_followers_cached ?? (series.length > 0 ? series[series.length - 1].total_followers : null);
          const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
          const olderEntries = series.filter((g) => new Date(g.date).getTime() <= thirtyDaysAgo);
          const baseline = olderEntries.length > 0 ? olderEntries[olderEntries.length - 1].total_followers : (series[0]?.total_followers ?? current);
          const netNew30d = current != null && baseline != null ? current - baseline : 0;
          const pace = computePace({
            current,
            target: s.follower_target,
            deadline: s.target_deadline,
            netNew30d,
          });
          const tone = STATUS_TONE[pace.status];
          const ToneIcon = tone.icon;
          const Icon = PLATFORM_META[s.platform].icon;
          return (
            <Card key={s.platform} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-5 w-5", PLATFORM_META[s.platform].color)} />
                  <h3 className="font-semibold">{PLATFORM_META[s.platform].label}</h3>
                </div>
                <Badge variant="outline" className={cn("gap-1 border", tone.className)}>
                  <ToneIcon className="h-3 w-3" /> {tone.label}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl font-semibold tabular-nums"><CompactNumber value={current} /></div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Current</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold tabular-nums"><CompactNumber value={s.follower_target} /></div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Target</div>
                </div>
                <div>
                  <div className={cn("text-2xl font-semibold tabular-nums", netNew30d > 0 ? "text-emerald-600" : netNew30d < 0 ? "text-destructive" : "")}>
                    <CompactNumber value={netNew30d} prefix={netNew30d > 0 ? "+" : ""} />
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">30 days</div>
                </div>
              </div>
              {pace.target != null && pace.current != null && (
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, ((pace.current ?? 0) / pace.target) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                    <span>
                      {pace.daysToDeadline != null
                        ? `${pace.daysToDeadline}d to ${s.target_deadline ? format(new Date(s.target_deadline), "d MMM yyyy") : "—"}`
                        : "—"}
                    </span>
                    <span>
                      {pace.perDayNeeded != null ? `need ${pace.perDayNeeded.toFixed(1)}/day` : "—"} ·{" "}
                      doing {pace.perDayActual.toFixed(1)}/day
                    </span>
                  </div>
                </div>
              )}
              {series.length > 1 && (
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series.map((g) => ({ ...g, ts: new Date(g.date).getTime() }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" hide />
                      <YAxis domain={["auto", "auto"]} hide />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                        labelFormatter={(l) => format(new Date(l as string), "d MMM yyyy")}
                        formatter={(v: number) => [`${v.toLocaleString()} (${formatCompact(v)})`, "Followers"]}
                      />
                      {s.follower_target != null && (
                        <ReferenceLine y={s.follower_target} stroke="hsl(var(--primary))" strokeDasharray="3 3" />
                      )}
                      <Line type="monotone" dataKey="total_followers" stroke={PLATFORM_META[s.platform].hex} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Top posts by engagement rate</h3>
        {topPosts.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No metrics logged yet. Open a post to add a snapshot or import a LinkedIn .xlsx.
          </div>
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

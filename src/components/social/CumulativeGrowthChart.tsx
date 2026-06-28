import { useMemo, useState } from "react";
import { format, startOfMonth, startOfWeek } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Upload } from "lucide-react";
import { PLATFORM_META, SOCIAL_PLATFORMS, formatCompact, type SocialPlatform } from "@/lib/social";
import { useFollowerGrowth } from "@/hooks/useFollowerGrowth";
import { useSocialPlatformSettings } from "@/hooks/useSocialPlatformSettings";
import { AggregateImportDialog } from "./AggregateImportDialog";

type Bucket = "week" | "month";

export function CumulativeGrowthChart() {
  const { data: growth = [], isLoading } = useFollowerGrowth();
  const { data: settings = [] } = useSocialPlatformSettings();
  const [bucket, setBucket] = useState<Bucket>("month");
  const [importOpen, setImportOpen] = useState(false);

  const enabledPlatforms = useMemo(() => {
    const set = new Set<SocialPlatform>();
    for (const s of settings) if (s.enabled) set.add(s.platform);
    for (const g of growth) set.add(g.platform);
    return SOCIAL_PLATFORMS.filter((p) => set.has(p));
  }, [settings, growth]);

  const chartData = useMemo(() => {
    if (growth.length === 0) return [] as Array<Record<string, any>>;

    // Build period key fn
    const keyOf = (iso: string) => {
      const d = new Date(iso);
      const base = bucket === "month" ? startOfMonth(d) : startOfWeek(d, { weekStartsOn: 1 });
      return base.toISOString().slice(0, 10);
    };

    // For each platform, group by bucket and take the LAST total_followers in the bucket
    const perPlatform: Record<string, Map<string, number>> = {};
    for (const g of growth) {
      const k = keyOf(g.date);
      perPlatform[g.platform] ??= new Map();
      // since growth rows are ordered ascending, last write wins
      perPlatform[g.platform].set(k, g.total_followers);
    }

    const allKeys = new Set<string>();
    for (const p of Object.keys(perPlatform)) for (const k of perPlatform[p].keys()) allKeys.add(k);
    const sortedKeys = Array.from(allKeys).sort();

    // Carry-forward each platform's last known total across buckets
    const lastSeen: Record<string, number | null> = {};
    return sortedKeys.map((k) => {
      const row: Record<string, any> = { period: k };
      for (const p of enabledPlatforms) {
        const v = perPlatform[p]?.get(k);
        if (v != null) lastSeen[p] = v;
        row[p] = lastSeen[p] ?? 0;
      }
      return row;
    });
  }, [growth, bucket, enabledPlatforms]);

  const totalNow = useMemo(() => {
    const last = chartData[chartData.length - 1];
    if (!last) return 0;
    return enabledPlatforms.reduce((s, p) => s + (last[p] ?? 0), 0);
  }, [chartData, enabledPlatforms]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold">Cumulative follower growth</h2>
            <p className="text-xs text-muted-foreground">
              Stacked by platform · {chartData.length} {bucket === "month" ? "months" : "weeks"} ·
              <span className="ml-1 font-medium text-foreground">{formatCompact(totalNow)}</span> total today
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-muted rounded-md p-0.5">
              {(["week", "month"] as Bucket[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBucket(b)}
                  className={`px-3 py-1 text-xs rounded-sm capitalize ${
                    bucket === b ? "bg-background shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {b}ly
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setImportOpen(true)}>
              <Upload className="h-3.5 w-3.5" /> Import aggregate
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
            <p>No follower history yet.</p>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Import LinkedIn aggregate .xlsx
            </Button>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="period"
                  tickFormatter={(v) => format(new Date(v), bucket === "month" ? "MMM yy" : "d MMM")}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tickFormatter={(v) => formatCompact(Number(v))} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                  labelFormatter={(l) => format(new Date(l as string), "MMMM yyyy")}
                  formatter={(value: number, name: string) => [
                    formatCompact(value),
                    PLATFORM_META[name as SocialPlatform]?.label ?? name,
                  ]}
                />
                <Legend
                  formatter={(name) => PLATFORM_META[name as SocialPlatform]?.label ?? name}
                  wrapperStyle={{ fontSize: 12 }}
                />
                {enabledPlatforms.map((p) => (
                  <Bar
                    key={p}
                    dataKey={p}
                    stackId="followers"
                    fill={PLATFORM_META[p].hex}
                    radius={[0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <AggregateImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

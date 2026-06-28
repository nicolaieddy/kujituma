import { useMemo, useState } from "react";
import { format, startOfMonth, startOfWeek } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Upload, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM_META, SOCIAL_PLATFORMS, formatCompact, type SocialPlatform } from "@/lib/social";
import { useFollowerGrowth } from "@/hooks/useFollowerGrowth";
import { useSocialPlatformSettings } from "@/hooks/useSocialPlatformSettings";
import { AggregateImportDialog } from "./AggregateImportDialog";
import type { DateRange } from "react-day-picker";

type Bucket = "week" | "month";

export function CumulativeGrowthChart() {
  const { data: growth = [], isLoading } = useFollowerGrowth();
  const { data: settings = [] } = useSocialPlatformSettings();
  const [bucket, setBucket] = useState<Bucket>("month");
  const [importOpen, setImportOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);

  const enabledPlatforms = useMemo(() => {
    const set = new Set<SocialPlatform>();
    for (const s of settings) if (s.enabled) set.add(s.platform);
    for (const g of growth) set.add(g.platform);
    return SOCIAL_PLATFORMS.filter((p) => set.has(p));
  }, [settings, growth]);

  const filteredGrowth = useMemo(() => {
    if (!range?.from && !range?.to) return growth;
    const fromT = range?.from ? new Date(range.from).setHours(0, 0, 0, 0) : -Infinity;
    const toT = range?.to ? new Date(range.to).setHours(23, 59, 59, 999) : Infinity;
    return growth.filter((g) => {
      const t = new Date(g.date).getTime();
      return t >= fromT && t <= toT;
    });
  }, [growth, range]);

  const chartData = useMemo(() => {
    if (filteredGrowth.length === 0) return [] as Array<Record<string, any>>;

    const keyOf = (iso: string) => {
      const d = new Date(iso);
      const base = bucket === "month" ? startOfMonth(d) : startOfWeek(d, { weekStartsOn: 1 });
      return base.toISOString().slice(0, 10);
    };

    const perPlatform: Record<string, Map<string, number>> = {};
    for (const g of filteredGrowth) {
      const k = keyOf(g.date);
      perPlatform[g.platform] ??= new Map();
      perPlatform[g.platform].set(k, g.total_followers);
    }

    const allKeys = new Set<string>();
    for (const p of Object.keys(perPlatform)) for (const k of perPlatform[p].keys()) allKeys.add(k);
    const sortedKeys = Array.from(allKeys).sort();

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
  }, [filteredGrowth, bucket, enabledPlatforms]);

  const totalNow = useMemo(() => {
    const last = chartData[chartData.length - 1];
    if (!last) return 0;
    return enabledPlatforms.reduce((s, p) => s + (last[p] ?? 0), 0);
  }, [chartData, enabledPlatforms]);

  const rangeLabel = range?.from
    ? `${format(range.from, "d MMM yy")}${range.to ? ` – ${format(range.to, "d MMM yy")}` : ""}`
    : "All time";

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold">Cumulative follower growth</h2>
            <p className="text-xs text-muted-foreground">
              Stacked by platform · {chartData.length} {bucket === "month" ? "months" : "weeks"} ·
              <span className="ml-1 font-medium text-foreground">{formatCompact(totalNow)}</span> total in range
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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

            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn("gap-1.5", !range?.from && "text-muted-foreground")}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {rangeLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  numberOfMonths={2}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
                <div className="flex items-center justify-between border-t p-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => setRange(undefined)}
                    disabled={!range?.from}
                  >
                    <X className="h-3.5 w-3.5" /> Clear
                  </Button>
                  <Button size="sm" onClick={() => setPickerOpen(false)}>
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setImportOpen(true)}>
              <Upload className="h-3.5 w-3.5" /> Import aggregate
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
            <p>No follower history in this range.</p>
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
                <YAxis
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    const n = Number(payload.value);
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text x={-4} y={0} dy={4} textAnchor="end" fontSize={11} fill="hsl(var(--muted-foreground))">
                          {formatCompact(n)}
                          <title>{n.toLocaleString()}</title>
                        </text>
                      </g>
                    );
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                  labelFormatter={(l) =>
                    format(new Date(l as string), bucket === "month" ? "MMMM yyyy" : "'Week of' d MMM yyyy")
                  }
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} (${formatCompact(value)})`,
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

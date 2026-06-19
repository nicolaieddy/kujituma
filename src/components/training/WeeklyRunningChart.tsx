import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Activity, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { parseLocalDate } from "@/utils/dateUtils";
import { useWeeklyRunningKm } from "@/hooks/useWeeklyRunningKm";

type Range = 12 | 26 | 52 | 0; // 0 = all-time

const RANGES: { value: Range; label: string }[] = [
  { value: 12, label: "12w" },
  { value: 26, label: "26w" },
  { value: 52, label: "52w" },
  { value: 0, label: "All" },
];

export function WeeklyRunningChart() {
  const [range, setRange] = useState<Range>(26);
  const { data: rows = [], isLoading } = useWeeklyRunningKm(range === 0 ? undefined : range);

  const stats = useMemo(() => {
    if (rows.length === 0) return null;
    const total = rows.reduce((s, r) => s + r.total_km, 0);
    const weeksWithRuns = rows.filter((r) => r.total_km > 0).length || 1;
    const avg = total / weeksWithRuns;
    const peak = rows.reduce((m, r) => (r.total_km > m.total_km ? r : m), rows[0]);
    return {
      total: Math.round(total * 10) / 10,
      avg: Math.round(avg * 10) / 10,
      peak,
    };
  }, [rows]);

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        label: format(parseLocalDate(r.week_start), rows.length > 30 ? "d MMM" : "d MMM"),
      })),
    [rows],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Weekly running distance
          </CardTitle>
          <CardDescription>
            Kilometres run per week across all running activities (Run, TrailRun, treadmill).
          </CardDescription>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              variant={range === r.value ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold tabular-nums">{stats.total} km</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Avg / active week</p>
              <p className="text-lg font-semibold tabular-nums">{stats.avg} km</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Peak
              </p>
              <p className="text-lg font-semibold tabular-nums">{stats.peak.total_km} km</p>
              <p className="text-[10px] text-muted-foreground">
                w/o {format(parseLocalDate(stats.peak.week_start), "d MMM yyyy")}
              </p>
            </div>
          </div>
        )}

        <div className="h-64 w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No running activities yet. Connect Strava or upload a .fit file to get started.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tickFormatter={(v) => `${v}`}
                />
                {stats && (
                  <ReferenceLine
                    y={stats.avg}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    label={{ value: `avg ${stats.avg}km`, position: "right", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                )}
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number, _name, props: any) => {
                    const p = props?.payload as { run_count: number; total_duration_min: number };
                    return [
                      `${value} km · ${p?.run_count ?? 0} run${p?.run_count === 1 ? "" : "s"} · ${p?.total_duration_min ?? 0} min`,
                      "Weekly",
                    ];
                  }}
                  labelFormatter={(label, payload) => {
                    const wk = payload?.[0]?.payload?.week_start;
                    return wk ? `Week of ${format(parseLocalDate(wk), "d MMM yyyy")}` : label;
                  }}
                />
                <Bar dataKey="total_km" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

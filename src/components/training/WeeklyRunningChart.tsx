import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Activity, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  startOfWeek,
  startOfMonth,
  startOfYear,
  format,
  subWeeks,
  subMonths,
  subYears,
  addWeeks,
  addMonths,
  addYears,
  getISOWeek,
  getMonth,
  getYear,
} from "date-fns";
import { useRunningSessions, type RunningSession } from "@/hooks/useRunningSessions";
import { useMonthlyDistanceAggregates, type MonthlyAggregate } from "@/hooks/useMonthlyDistanceAggregates";

type Granularity = "week" | "month" | "year";
type Mode = "trailing" | "compare";

const TRAILING_RANGES: Record<Granularity, { value: number; label: string }[]> = {
  week: [
    { value: 12, label: "12w" },
    { value: 26, label: "26w" },
    { value: 52, label: "52w" },
    { value: 0, label: "All" },
  ],
  month: [
    { value: 6, label: "6m" },
    { value: 12, label: "12m" },
    { value: 24, label: "24m" },
    { value: 0, label: "All" },
  ],
  year: [
    { value: 3, label: "3y" },
    { value: 5, label: "5y" },
    { value: 0, label: "All" },
  ],
};

const COMPARE_YEARS = [
  { value: 2, label: "vs last yr" },
  { value: 3, label: "+ 2 yrs ago" },
  { value: 4, label: "+ 3 yrs ago" },
];

const YEAR_COLORS = [
  "hsl(var(--primary))",
  "hsl(25 95% 53%)", // orange
  "hsl(217 91% 60%)", // blue
  "hsl(280 80% 60%)", // purple
];

interface Bucket {
  key: string;        // ISO key for sorting (e.g. 2026-W23 / 2026-06 / 2026)
  label: string;      // x-axis label
  total_km: number;
  count: number;
  duration_min: number;
}

function bucketKey(d: Date, g: Granularity): string {
  if (g === "year") return String(getYear(d));
  if (g === "month") return format(startOfMonth(d), "yyyy-MM");
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

function bucketLabel(d: Date, g: Granularity): string {
  if (g === "year") return String(getYear(d));
  if (g === "month") return format(d, "MMM yy");
  return format(d, "d MMM");
}

function aggregate(sessions: RunningSession[], g: Granularity): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const s of sessions) {
    const startDate =
      g === "year" ? startOfYear(s.localDate)
      : g === "month" ? startOfMonth(s.localDate)
      : startOfWeek(s.localDate, { weekStartsOn: 1 });
    const key = bucketKey(s.localDate, g);
    const existing = map.get(key) ?? {
      key,
      label: bucketLabel(startDate, g),
      total_km: 0,
      count: 0,
      duration_min: 0,
    };
    existing.total_km += s.distance_km;
    existing.count += 1;
    existing.duration_min += s.duration_min;
    map.set(key, existing);
  }
  return Array.from(map.values()).sort((a, b) => (a.key < b.key ? -1 : 1));
}

function trimToTrailing(buckets: Bucket[], g: Granularity, n: number): Bucket[] {
  if (!n) return buckets;
  const now = new Date();
  const start =
    g === "year" ? startOfYear(subYears(now, n - 1))
    : g === "month" ? startOfMonth(subMonths(now, n - 1))
    : startOfWeek(subWeeks(now, n - 1), { weekStartsOn: 1 });
  const startKey = bucketKey(start, g);
  return buckets.filter((b) => b.key >= startKey);
}

function fillGaps(buckets: Bucket[], g: Granularity, n: number): Bucket[] {
  if (!n) return buckets;
  const filled: Bucket[] = [];
  const map = new Map(buckets.map((b) => [b.key, b]));
  const now = new Date();
  const start =
    g === "year" ? startOfYear(subYears(now, n - 1))
    : g === "month" ? startOfMonth(subMonths(now, n - 1))
    : startOfWeek(subWeeks(now, n - 1), { weekStartsOn: 1 });
  for (let i = 0; i < n; i++) {
    const d =
      g === "year" ? addYears(start, i)
      : g === "month" ? addMonths(start, i)
      : addWeeks(start, i);
    const key = bucketKey(d, g);
    filled.push(map.get(key) ?? { key, label: bucketLabel(d, g), total_km: 0, count: 0, duration_min: 0 });
  }
  return filled;
}

/** Position-within-year for year-over-year overlay. */
function periodIndex(d: Date, g: Granularity): number {
  if (g === "month") return getMonth(d); // 0..11
  return getISOWeek(d); // 1..53
}

function periodLabel(idx: number, g: Granularity): string {
  if (g === "month") return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][idx];
  return `W${idx}`;
}

interface CompareRow {
  period: number;
  label: string;
  [yearKey: string]: number | string;
}

function buildCompareSeries(
  sessions: RunningSession[],
  g: Exclude<Granularity, "year">,
  yearsBack: number,
): { rows: CompareRow[]; years: number[] } {
  const currentYear = getYear(new Date());
  const years: number[] = [];
  for (let i = 0; i < yearsBack; i++) years.push(currentYear - i);

  const slots = g === "month" ? 12 : 53;
  const rows: CompareRow[] = [];
  for (let i = 0; i < slots; i++) {
    const idx = g === "month" ? i : i + 1;
    const row: CompareRow = { period: idx, label: periodLabel(idx, g) };
    for (const y of years) row[String(y)] = 0;
    rows.push(row);
  }

  for (const s of sessions) {
    const y = getYear(s.localDate);
    if (!years.includes(y)) continue;
    const idx = periodIndex(s.localDate, g);
    const slot = g === "month" ? idx : idx - 1;
    if (slot < 0 || slot >= slots) continue;
    rows[slot][String(y)] = (rows[slot][String(y)] as number) + s.distance_km;
  }

  // Round
  for (const r of rows) for (const y of years) r[String(y)] = Math.round((r[String(y)] as number) * 10) / 10;
  return { rows, years };
}

export function WeeklyRunningChart() {
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [mode, setMode] = useState<Mode>("trailing");
  // Defaults: 52 weeks / 12 months / 3 years
  const DEFAULT_TRAILING: Record<Granularity, number> = { week: 52, month: 12, year: 3 };
  const [trailingN, setTrailingN] = useState<number>(DEFAULT_TRAILING.week);
  const [compareYears, setCompareYears] = useState<number>(2);
  const { data: sessions = [], isLoading } = useRunningSessions();

  // Reset trailing to a sensible default when granularity changes
  const ranges = TRAILING_RANGES[granularity];
  const trailingActive = ranges.find((r) => r.value === trailingN) ? trailingN : ranges[0].value;

  // Trailing mode data
  const trailingData = useMemo(() => {
    const agg = aggregate(sessions, granularity);
    const trimmed = trailingActive ? trimToTrailing(agg, granularity, trailingActive) : agg;
    return trailingActive ? fillGaps(trimmed, granularity, trailingActive) : trimmed;
  }, [sessions, granularity, trailingActive]);

  const stats = useMemo(() => {
    const source = mode === "trailing" ? trailingData : aggregate(sessions, granularity);
    if (source.length === 0) return null;
    const total = source.reduce((s, r) => s + r.total_km, 0);
    const active = source.filter((r) => r.total_km > 0).length || 1;
    const peak = source.reduce((m, r) => (r.total_km > m.total_km ? r : m), source[0]);
    return {
      total: Math.round(total * 10) / 10,
      avg: Math.round((total / active) * 10) / 10,
      peak,
    };
  }, [mode, trailingData, sessions, granularity]);

  // Compare mode is only meaningful for week/month
  const compareGranularity: "week" | "month" = granularity === "year" ? "week" : granularity;
  const compare = useMemo(
    () => buildCompareSeries(sessions, compareGranularity, compareYears),
    [sessions, compareGranularity, compareYears],
  );

  const unitLabel = granularity === "year" ? "year" : granularity === "month" ? "month" : "week";

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Running distance
            </CardTitle>
            <CardDescription>
              Kilometres run per {unitLabel} across all running activities (Run, TrailRun, treadmill).
            </CardDescription>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Granularity */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["week", "month", "year"] as Granularity[]).map((g) => (
              <Button
                key={g}
                variant={granularity === g ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs capitalize"
                onClick={() => {
                  setGranularity(g);
                  setTrailingN(DEFAULT_TRAILING[g]);
                  if (g === "year" && mode === "compare") setMode("trailing");
                }}
              >
                {g}
              </Button>
            ))}
          </div>

          {/* Mode */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={mode === "trailing" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setMode("trailing")}
            >
              Trailing
            </Button>
            <Button
              variant={mode === "compare" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              disabled={granularity === "year"}
              onClick={() => setMode("compare")}
            >
              Compare years
            </Button>
          </div>

          {/* Trailing range OR compare-years selector */}
          {mode === "trailing" ? (
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {ranges.map((r) => (
                <Button
                  key={r.value}
                  variant={trailingActive === r.value ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setTrailingN(r.value)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          ) : (
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {COMPARE_YEARS.map((c) => (
                <Button
                  key={c.value}
                  variant={compareYears === c.value ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setCompareYears(c.value)}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {stats && mode === "trailing" && (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold tabular-nums">{stats.total} km</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Avg / active {unitLabel}</p>
              <p className="text-lg font-semibold tabular-nums">{stats.avg} km</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Peak
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {Math.round(stats.peak.total_km * 10) / 10} km
              </p>
              <p className="text-[10px] text-muted-foreground">{stats.peak.label}</p>
            </div>
          </div>
        )}

        <div className="h-72 w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No running activities yet. Connect Strava or upload a .fit file to get started.
            </div>
          ) : mode === "trailing" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trailingData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
                />
                {stats && (
                  <ReferenceLine
                    y={stats.avg}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    label={{
                      value: `avg ${stats.avg}km`,
                      position: "right",
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
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
                    const p = props?.payload as { count: number; duration_min: number };
                    return [
                      `${Math.round(value * 10) / 10} km · ${p?.count ?? 0} run${p?.count === 1 ? "" : "s"} · ${Math.round(p?.duration_min ?? 0)} min`,
                      unitLabel,
                    ];
                  }}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="total_km" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={compare.rows} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={compareGranularity === "month" ? 0 : "preserveStartEnd"}
                  minTickGap={16}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [`${value} km`, name]}
                  labelFormatter={(l) => l}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {compare.years.map((y, i) => (
                  <Line
                    key={y}
                    type="monotone"
                    dataKey={String(y)}
                    name={String(y)}
                    stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                    strokeWidth={i === 0 ? 2.5 : 1.75}
                    strokeOpacity={i === 0 ? 1 : 0.75}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Activity, TrendingUp, Trophy, HeartPulse } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from "recharts";

import {
  startOfWeek,
  startOfMonth,
  endOfMonth,
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
import { useTrainingEvents, type TrainingEvent } from "@/hooks/useTrainingEvents";
import { parseLocalDate } from "@/utils/dateUtils";

const RACE_COLOR = "hsl(45 93% 55%)"; // amber
const INJURY_COLOR = "hsl(0 72% 51%)"; // red


type Granularity = "week" | "month" | "year";
type Mode = "trailing" | "compare";

const TRAILING_RANGES: Record<Granularity, { value: number; label: string }[]> = {
  week: [
    { value: -1, label: "YTD" },
    { value: 12, label: "12w" },
    { value: 26, label: "26w" },
    { value: 52, label: "52w" },
    { value: 0, label: "All" },
  ],
  month: [
    { value: -1, label: "YTD" },
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
  imported_km?: number; // weekly avg derived from a Garmin monthly aggregate
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

/**
 * Apply monthly aggregate imports (e.g. Garmin CSV).
 * - month/year: take the LARGER of (sessions total, imported aggregate total).
 * - week: for months that have NO session data, distribute the monthly total
 *   evenly across weeks whose Monday falls in that month and expose it as
 *   `imported_km` so the chart can render it with a distinct style.
 */
function reconcileWithAggregates(
  buckets: Bucket[],
  aggregates: MonthlyAggregate[],
  g: Granularity,
  includeMissingBuckets = false,
): Bucket[] {
  if (aggregates.length === 0) return buckets;

  if (g === "week") {
    const map = new Map(buckets.map((b) => [b.key, { ...b, imported_km: 0 }]));
    // Dedupe: at most one (largest) aggregate per month across sources.
    const perMonth = new Map<string, number>();
    for (const a of aggregates) {
      const monthKey = a.month.slice(0, 7);
      perMonth.set(monthKey, Math.max(perMonth.get(monthKey) ?? 0, a.distance_km));
    }
    for (const [monthKey, distance_km] of perMonth) {
      const a = { month: `${monthKey}-01`, distance_km };
      const monthStart = startOfMonth(new Date(a.month + "T12:00:00"));
      const monthEnd = endOfMonth(monthStart);
      const weekStarts: Date[] = [];
      let w = startOfWeek(monthStart, { weekStartsOn: 1 });
      while (w < monthStart) w = addWeeks(w, 1);
      while (w <= monthEnd) {
        weekStarts.push(w);
        w = addWeeks(w, 1);
      }
      if (weekStarts.length === 0) continue;
      // If sessions already exist in any of these weeks, sessions win — skip.
      const sessionSum = weekStarts.reduce(
        (s, ws) => s + (map.get(bucketKey(ws, "week"))?.total_km ?? 0),
        0,
      );
      if (sessionSum > 0) continue;
      const per = a.distance_km / weekStarts.length;
      for (const ws of weekStarts) {
        const k = bucketKey(ws, "week");
        const existing = map.get(k);
        if (existing) {
          existing.imported_km = per;
        } else if (includeMissingBuckets) {
          map.set(k, {
            key: k,
            label: bucketLabel(ws, "week"),
            total_km: 0,
            count: 0,
            duration_min: 0,
            imported_km: per,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.key < b.key ? -1 : 1));
  }

  // Deduplicate aggregates across sources: take the MAX per actual month
  // (otherwise a month with both a Garmin CSV row and a sessions-derived row
  // would be summed and double-counted).
  const perMonth = new Map<string, number>();
  for (const a of aggregates) {
    const monthKey = a.month.slice(0, 7); // YYYY-MM
    perMonth.set(monthKey, Math.max(perMonth.get(monthKey) ?? 0, a.distance_km));
  }

  // Roll up into the requested granularity (sum monthly maxes into years).
  const aggTotals = new Map<string, number>();
  for (const [monthKey, km] of perMonth) {
    const d = new Date(monthKey + "-01T12:00:00");
    const key = bucketKey(d, g);
    aggTotals.set(key, (aggTotals.get(key) ?? 0) + km);
  }

  const map = new Map(buckets.map((b) => [b.key, { ...b, imported_km: 0 }]));
  for (const [key, kmAgg] of aggTotals) {
    const existing = map.get(key);
    if (!existing) {
      if (!includeMissingBuckets) continue; // outside the selected trailing window
      const d = new Date((g === "year" ? `${key}-01-01` : `${key}-01`) + "T12:00:00");
      map.set(key, {
        key,
        label: bucketLabel(g === "year" ? startOfYear(d) : startOfMonth(d), g),
        total_km: 0,
        count: 0,
        duration_min: 0,
        imported_km: kmAgg,
      });
      continue;
    }
    // If the imported aggregate exceeds session data, surface the difference
    // as a separate `imported_km` slice so it stacks visually and is labeled
    // as Garmin backfill in the tooltip.
    if (kmAgg > existing.total_km) {
      existing.imported_km = Math.round((kmAgg - existing.total_km) * 10) / 10;
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.key < b.key ? -1 : 1));
}

function trimToTrailing(buckets: Bucket[], g: Granularity, n: number): Bucket[] {
  if (!n) return buckets; // "All"
  const now = new Date();
  let start: Date;
  if (n === -1) {
    start = g === "year"
      ? startOfYear(now)
      : g === "month"
      ? startOfYear(now)
      : startOfWeek(startOfYear(now), { weekStartsOn: 1 });
  } else {
    start =
      g === "year" ? startOfYear(subYears(now, n - 1))
      : g === "month" ? startOfMonth(subMonths(now, n - 1))
      : startOfWeek(subWeeks(now, n - 1), { weekStartsOn: 1 });
  }
  const startKey = bucketKey(start, g);
  return buckets.filter((b) => b.key >= startKey);
}

function fillGaps(buckets: Bucket[], g: Granularity, n: number): Bucket[] {
  if (!n) return buckets; // "All"
  const filled: Bucket[] = [];
  const map = new Map(buckets.map((b) => [b.key, b]));
  const now = new Date();
  let start: Date;
  let count: number;
  if (n === -1) {
    if (g === "year") {
      start = startOfYear(now);
      count = 1;
    } else if (g === "month") {
      start = startOfYear(now);
      count = getMonth(now) + 1;
    } else {
      start = startOfWeek(startOfYear(now), { weekStartsOn: 1 });
      count = 0;
      let d = start;
      while (d <= now) {
        count++;
        d = addWeeks(d, 1);
      }
    }
  } else {
    start =
      g === "year" ? startOfYear(subYears(now, n - 1))
      : g === "month" ? startOfMonth(subMonths(now, n - 1))
      : startOfWeek(subWeeks(now, n - 1), { weekStartsOn: 1 });
    count = n;
  }
  for (let i = 0; i < count; i++) {
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

interface RunningTooltipPayload {
  count: number;
  duration_min: number;
}

function buildCompareSeries(
  sessions: RunningSession[],
  aggregates: MonthlyAggregate[],
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

  // For month granularity, reconcile each (year, month) cell with the larger of
  // (session sum, imported Garmin aggregate). For week compare, leave as-is.
  if (g === "month") {
    for (const a of aggregates) {
      const d = new Date(a.month + "T12:00:00");
      const y = getYear(d);
      if (!years.includes(y)) continue;
      const slot = getMonth(d);
      const existing = rows[slot][String(y)] as number;
      if (a.distance_km > existing) rows[slot][String(y)] = a.distance_km;
    }
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
  const [compareYTD, setCompareYTD] = useState<boolean>(false);
  const [showInjuries, setShowInjuries] = useState<boolean>(false);
  const [showRaces, setShowRaces] = useState<boolean>(true);
  const { data: sessions = [], isLoading } = useRunningSessions();
  const { data: aggregates = [] } = useMonthlyDistanceAggregates("Running");
  const { data: events = [] } = useTrainingEvents();


  // Reset trailing to a sensible default when granularity changes
  const ranges = TRAILING_RANGES[granularity];
  const trailingActive = ranges.find((r) => r.value === trailingN) ? trailingN : ranges[0].value;

  // Trailing mode data — sessions, gap-filled, then merged with Garmin monthly aggregates (take max per bucket)
  const trailingData = useMemo(() => {
    const agg = aggregate(sessions, granularity);
    const trimmed = trailingActive ? trimToTrailing(agg, granularity, trailingActive) : agg;
    const filled = trailingActive ? fillGaps(trimmed, granularity, trailingActive) : trimmed;
    return reconcileWithAggregates(filled, aggregates, granularity, trailingActive === 0);
  }, [sessions, aggregates, granularity, trailingActive]);

  const stats = useMemo(() => {
    const source = mode === "trailing"
      ? trailingData
      : reconcileWithAggregates(aggregate(sessions, granularity), aggregates, granularity);
    if (source.length === 0) return null;
    const value = (r: Bucket) => r.total_km + (r.imported_km ?? 0);
    const total = source.reduce((s, r) => s + value(r), 0);
    const active = source.filter((r) => value(r) > 0).length || 1;
    const peak = source.reduce((m, r) => (value(r) > value(m) ? r : m), source[0]);
    return {
      total: Math.round(total * 10) / 10,
      avg: Math.round((total / active) * 10) / 10,
      peak: { ...peak, total_km: value(peak) },
    };
  }, [mode, trailingData, sessions, aggregates, granularity]);

  // Compare mode is only meaningful for week/month
  const compareGranularity: "week" | "month" = granularity === "year" ? "week" : granularity;
  const compare = useMemo(
    () => {
      const built = buildCompareSeries(sessions, aggregates, compareGranularity, compareYears);
      if (!compareYTD) return built;
      const now = new Date();
      const cutoff = compareGranularity === "month" ? getMonth(now) + 1 : getISOWeek(now);
      return { ...built, rows: built.rows.slice(0, cutoff) };
    },
    [sessions, aggregates, compareGranularity, compareYears, compareYTD],
  );

  // ── Event overlays (races + injury/illness) ──────────────────────────
  const races = useMemo(() => events.filter((e) => e.event_type === "race"), [events]);
  const injuries = useMemo(() => events.filter((e) => e.event_type === "injury_illness"), [events]);

  // For trailing mode: map each event to bucket label(s) in the visible window.
  const trailingOverlays = useMemo(() => {
    if (trailingData.length === 0) return { races: [], injuries: [], raceKeys: new Map<string, TrainingEvent>() };
    const firstKey = trailingData[0].key;
    const lastKey = trailingData[trailingData.length - 1].key;

    const raceKeys = new Map<string, TrainingEvent>();
    const raceMarkers: { label: string; event: TrainingEvent }[] = [];
    for (const r of races) {
      const d = parseLocalDate(r.start_date);
      const k = bucketKey(d, granularity);
      if (k < firstKey || k > lastKey) continue;
      const bucket = trailingData.find((b) => b.key === k);
      if (!bucket) continue;
      raceKeys.set(k, r);
      raceMarkers.push({ label: bucket.label, event: r });
    }

    const injuryBands: { x1: string; x2: string; event: TrainingEvent }[] = [];
    for (const inj of injuries) {
      const start = parseLocalDate(inj.start_date);
      const end = inj.end_date ? parseLocalDate(inj.end_date) : start;
      const sKey = bucketKey(start, granularity);
      const eKey = bucketKey(end, granularity);
      if (eKey < firstKey || sKey > lastKey) continue;
      const startBucket = trailingData.find((b) => b.key >= sKey) ?? trailingData[0];
      const endBucket = [...trailingData].reverse().find((b) => b.key <= eKey) ?? trailingData[trailingData.length - 1];
      injuryBands.push({ x1: startBucket.label, x2: endBucket.label, event: inj });
    }
    return { races: raceMarkers, injuries: injuryBands, raceKeys };
  }, [trailingData, races, injuries, granularity]);

  // For compare mode: map events to period index → label. Only current year for injuries.
  const compareOverlays = useMemo(() => {
    if (compare.rows.length === 0) return { races: [], injuries: [] };
    const currentYear = getYear(new Date());
    const visibleYears = new Set(compare.years);
    const labelForDate = (d: Date) => {
      const idx = periodIndex(d, compareGranularity);
      return periodLabel(idx, compareGranularity);
    };
    const inRange = (label: string) => compare.rows.some((r) => r.label === label);

    const raceMarkers: { label: string; event: TrainingEvent; color: string }[] = [];
    for (const r of races) {
      const d = parseLocalDate(r.start_date);
      const y = getYear(d);
      if (!visibleYears.has(y)) continue;
      const label = labelForDate(d);
      if (!inRange(label)) continue;
      const i = compare.years.indexOf(y);
      raceMarkers.push({ label, event: r, color: YEAR_COLORS[i % YEAR_COLORS.length] });
    }

    const injuryBands: { x1: string; x2: string; event: TrainingEvent }[] = [];
    for (const inj of injuries) {
      const start = parseLocalDate(inj.start_date);
      const end = inj.end_date ? parseLocalDate(inj.end_date) : start;
      if (getYear(start) !== currentYear && getYear(end) !== currentYear) continue;
      const x1 = labelForDate(start);
      const x2 = labelForDate(end);
      if (!inRange(x1) && !inRange(x2)) continue;
      injuryBands.push({ x1, x2, event: inj });
    }
    return { races: raceMarkers, injuries: injuryBands };
  }, [compare, races, injuries, compareGranularity]);

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
            <div className="flex flex-wrap gap-2">
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
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={!compareYTD ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setCompareYTD(false)}
                >
                  Full year
                </Button>
                <Button
                  variant={compareYTD ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setCompareYTD(true)}
                >
                  YTD
                </Button>
              </div>
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

        {/* Data source key — always visible so it's obvious which bars come from where */}
        {mode === "trailing" ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            <span className="font-medium uppercase tracking-wide text-[10px] text-muted-foreground/70">
              Data sources
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ background: "hsl(var(--primary))" }}
                aria-hidden
              />
              Strava / .FIT sessions
            </span>
            {trailingData.some((b) => (b.imported_km ?? 0) > 0) && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-sm border border-dashed border-muted-foreground/60"
                  style={{ background: "hsl(var(--muted-foreground) / 0.35)" }}
                  aria-hidden
                />
                Garmin CSV backfill {granularity === "week" ? "(monthly avg / week)" : "(monthly total)"}
              </span>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground">
            Lines combine Strava / .FIT sessions with Garmin CSV backfill for months without session data.
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
                  formatter={(value: number, name, props: { payload?: RunningTooltipPayload }) => {
                    const p = props?.payload;
                    const km = `${Math.round(value * 10) / 10} km`;
                    if (name === "imported_km") {
                      return [`${km} (monthly avg)`, "Garmin backfill"];
                    }
                    return [
                      `${km} · ${p?.count ?? 0} run${p?.count === 1 ? "" : "s"} · ${Math.round(p?.duration_min ?? 0)} min`,
                      "Strava / .FIT",
                    ];
                  }}
                  labelFormatter={(label) => label}
                />


                <Bar
                  dataKey="total_km"
                  name="total_km"
                  stackId="km"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="imported_km"
                  name="imported_km"
                  stackId="km"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.35}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 2"
                  strokeWidth={1}
                  radius={[4, 4, 0, 0]}
                />
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

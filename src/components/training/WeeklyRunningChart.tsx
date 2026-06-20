import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Loader2, Activity, TrendingUp, Trophy, HeartPulse, Settings2 } from "lucide-react";
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
  Customized,
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
import { ChartTimeNavigator } from "@/components/training/ChartTimeNavigator";

const DEFAULT_RACE_COLOR = "#f5b942"; // amber
const DEFAULT_INJURY_COLOR = "#dc2626"; // red
const DEFAULT_INJURY_OPACITY = 0.18;

interface OverlayInjury { x1: string; x2: string; event: TrainingEvent }
interface OverlayRace { label: string; event: TrainingEvent; color?: string }

interface MakeOverlayArgs {
  injuries: OverlayInjury[];
  races: OverlayRace[];
  raceColor: string;
  injuryColor: string;
  injuryOpacity: number;
  onSelect: (id: string) => void;
}

/**
 * Custom Recharts overlay that draws injury bands and race markers as raw SVG
 * with native <title> hover tooltips and onClick to open the event.
 * Used inside <Customized component={...}> — receives the chart's xAxisMap+offset.
 */
function makeEventOverlay({
  injuries,
  races,
  raceColor,
  injuryColor,
  injuryOpacity,
  onSelect,
}: MakeOverlayArgs) {
  return function EventOverlay(chartProps: Record<string, unknown>) {
    const xAxisMap = chartProps.xAxisMap as Record<string, { scale?: (v: string) => number | undefined }> | undefined;
    const offset = chartProps.offset as { top: number; left: number; width: number; height: number } | undefined;
    if (!xAxisMap || !offset) return null;
    const firstKey = Object.keys(xAxisMap)[0];
    const scale = xAxisMap[firstKey]?.scale as
      | ((v: string) => number | undefined) & { bandwidth?: () => number }
      | undefined;
    if (!scale) return null;
    const bw = typeof scale.bandwidth === "function" ? scale.bandwidth() : 0;
    const safe = (v: number | undefined): number | null =>
      v == null || Number.isNaN(v) ? null : v;
    const leftPx = (label: string) => safe(scale(label));
    const rightPx = (label: string) => {
      const v = safe(scale(label));
      return v == null ? null : (bw ? v + bw : v);
    };
    const centerPx = (label: string) => {
      const v = safe(scale(label));
      return v == null ? null : (bw ? v + bw / 2 : v);
    };

    const top = offset.top;
    const height = offset.height;

    const fmtDate = (s: string) => {
      try {
        return format(parseLocalDate(s), "d MMM yyyy");
      } catch {
        return s;
      }
    };

    return (
      <g style={{ pointerEvents: "all" }}>
        {injuries.map((b, i) => {
          const x1 = leftPx(b.x1);
          const x2 = rightPx(b.x2);
          if (x1 == null || x2 == null) return null;
          const w = Math.max(2, x2 - x1);
          const ev = b.event;
          const dates = ev.end_date
            ? `${fmtDate(ev.start_date)} → ${fmtDate(ev.end_date)}`
            : fmtDate(ev.start_date);
          const sev = ev.severity ? `\nSeverity: ${ev.severity}/10` : "";
          const partsList = (ev as any).body_parts as Array<{ part: string; side: string; specific?: string }> | undefined;
          const part = partsList && partsList.length > 0
            ? `\nArea: ${partsList.map((p) => `${p.side === "left" ? "L " : p.side === "right" ? "R " : ""}${p.part}${p.specific ? ` (${p.specific})` : ""}`).join(", ")}`
            : ev.body_part ? `\nArea: ${ev.body_part}` : "";
          const notes = ev.description ? `\n\n${ev.description}` : "";
          return (
            <g
              key={`ov-inj-${ev.id}-${i}`}
              style={{ cursor: "pointer" }}
              onClick={() => onSelect(ev.id)}
            >
              <rect
                x={x1}
                y={top}
                width={w}
                height={height}
                fill={injuryColor}
                fillOpacity={injuryOpacity}
                stroke={injuryColor}
                strokeOpacity={Math.min(1, injuryOpacity * 3)}
                strokeDasharray="2 3"
              />
              <text x={x1 + 4} y={top + 11} fontSize={9} fill={injuryColor} style={{ pointerEvents: "none" }}>
                {ev.title}
              </text>
              <title>{`Injury / illness · ${ev.title}\n${dates}${sev}${part}${notes}\n\nClick to open in Events`}</title>
            </g>
          );
        })}
        {races.map((r, i) => {
          const cx = centerPx(r.label);
          if (cx == null) return null;
          const color = r.color ?? raceColor;
          const ev = r.event;
          const labelText = `🏁 ${ev.title}${ev.race_priority ? ` (${ev.race_priority})` : ""}`;
          const dist = ev.race_distance ? ` · ${ev.race_distance}` : "";
          const result = ev.race_result ? `\nResult: ${ev.race_result}` : "";
          const loc = ev.location ? `\nLocation: ${ev.location}` : "";
          const notes = ev.description ? `\n\n${ev.description}` : "";
          return (
            <g
              key={`ov-race-${ev.id}-${i}`}
              style={{ cursor: "pointer" }}
              onClick={() => onSelect(ev.id)}
            >
              {/* Wider invisible hover target so the title is easy to surface */}
              <rect x={cx - 6} y={top} width={12} height={height} fill="transparent" />
              <line
                x1={cx}
                x2={cx}
                y1={top}
                y2={top + height}
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray="2 2"
                style={{ pointerEvents: "none" }}
              />
              <text
                x={cx}
                y={top - 2}
                fontSize={9}
                fill={color}
                textAnchor="middle"
                style={{ pointerEvents: "none" }}
              >
                {labelText}
              </text>
              <title>{`Race · ${ev.title}${dist}\n${fmtDate(ev.start_date)}${result}${loc}${notes}\n\nClick to open in Events`}</title>
            </g>
          );
        })}
      </g>
    );
  };
}




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

function trimToTrailing(buckets: Bucket[], g: Granularity, n: number, end?: Date): Bucket[] {
  if (!n) return buckets; // "All"
  const anchor = end ?? new Date();
  let start: Date;
  let stopKey: string | null = null;
  if (n === -1) {
    start = g === "year"
      ? startOfYear(anchor)
      : g === "month"
      ? startOfYear(anchor)
      : startOfWeek(startOfYear(anchor), { weekStartsOn: 1 });
  } else {
    start =
      g === "year" ? startOfYear(subYears(anchor, n - 1))
      : g === "month" ? startOfMonth(subMonths(anchor, n - 1))
      : startOfWeek(subWeeks(anchor, n - 1), { weekStartsOn: 1 });
    stopKey = bucketKey(anchor, g);
  }
  const startKey = bucketKey(start, g);
  return buckets.filter((b) => b.key >= startKey && (stopKey == null || b.key <= stopKey));
}

function fillGaps(buckets: Bucket[], g: Granularity, n: number, end?: Date): Bucket[] {
  if (!n) return buckets; // "All"
  const filled: Bucket[] = [];
  const map = new Map(buckets.map((b) => [b.key, b]));
  const anchor = end ?? new Date();
  let start: Date;
  let count: number;
  if (n === -1) {
    if (g === "year") {
      start = startOfYear(anchor);
      count = 1;
    } else if (g === "month") {
      start = startOfYear(anchor);
      count = getMonth(anchor) + 1;
    } else {
      start = startOfWeek(startOfYear(anchor), { weekStartsOn: 1 });
      count = 0;
      let d = start;
      while (d <= anchor) {
        count++;
        d = addWeeks(d, 1);
      }
    }
  } else {
    start =
      g === "year" ? startOfYear(subYears(anchor, n - 1))
      : g === "month" ? startOfMonth(subMonths(anchor, n - 1))
      : startOfWeek(subWeeks(anchor, n - 1), { weekStartsOn: 1 });
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
  /** Window-end anchor for trailing mode. null = latest data. */
  const [anchorEnd, setAnchorEnd] = useState<Date | null>(null);
  const [showInjuries, setShowInjuries] = useState<boolean>(false);
  const [showRaces, setShowRaces] = useState<boolean>(true);
  const [raceColor, setRaceColor] = useState<string>(
    () => (typeof window !== "undefined" && localStorage.getItem("chartRaceColor")) || DEFAULT_RACE_COLOR,
  );
  const [injuryColor, setInjuryColor] = useState<string>(
    () => (typeof window !== "undefined" && localStorage.getItem("chartInjuryColor")) || DEFAULT_INJURY_COLOR,
  );
  const [injuryOpacity, setInjuryOpacity] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_INJURY_OPACITY;
    const v = Number(localStorage.getItem("chartInjuryOpacity"));
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_INJURY_OPACITY;
  });
  useEffect(() => {
    localStorage.setItem("chartRaceColor", raceColor);
    localStorage.setItem("chartInjuryColor", injuryColor);
    localStorage.setItem("chartInjuryOpacity", String(injuryOpacity));
  }, [raceColor, injuryColor, injuryOpacity]);
  const navigate = useNavigate();
  const openEvent = (id: string) => navigate(`/training?view=events#event-${id}`);
  const { data: sessions = [], isLoading } = useRunningSessions();
  const { data: aggregates = [] } = useMonthlyDistanceAggregates("Running");
  const { data: events = [] } = useTrainingEvents();



  // Reset trailing to a sensible default when granularity changes
  const ranges = TRAILING_RANGES[granularity];
  const trailingActive = ranges.find((r) => r.value === trailingN) ? trailingN : ranges[0].value;

  // Reset anchor when granularity or window size changes (avoid weird mismatches).
  useEffect(() => {
    setAnchorEnd(null);
  }, [granularity, trailingActive]);

  // Trailing mode data — sessions, gap-filled, then merged with Garmin monthly aggregates (take max per bucket)
  const trailingData = useMemo(() => {
    const agg = aggregate(sessions, granularity);
    const anchor = anchorEnd ?? undefined;
    const trimmed = trailingActive ? trimToTrailing(agg, granularity, trailingActive, anchor) : agg;
    const filled = trailingActive ? fillGaps(trimmed, granularity, trailingActive, anchor) : trimmed;
    return reconcileWithAggregates(filled, aggregates, granularity, trailingActive === 0);
  }, [sessions, aggregates, granularity, trailingActive, anchorEnd]);

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

  // ── Navigator data ───────────────────────────────────────────────────
  const dataExtents = useMemo(() => {
    const times: number[] = [];
    for (const s of sessions) times.push(s.localDate.getTime());
    for (const a of aggregates) {
      const d = new Date(a.month + "T12:00:00");
      times.push(d.getTime());
    }
    if (times.length === 0) return { minDate: null as Date | null, maxDate: null as Date | null };
    return {
      minDate: new Date(Math.min(...times)),
      maxDate: new Date(Math.max(...times, Date.now())),
    };
  }, [sessions, aggregates]);

  const miniSeries = useMemo(() => {
    if (!dataExtents.minDate || !dataExtents.maxDate) return [];
    const monthMap = new Map<string, number>();
    for (const s of sessions) {
      const k = format(startOfMonth(s.localDate), "yyyy-MM");
      monthMap.set(k, (monthMap.get(k) ?? 0) + s.distance_km);
    }
    for (const a of aggregates) {
      const k = a.month.slice(0, 7);
      monthMap.set(k, Math.max(monthMap.get(k) ?? 0, a.distance_km));
    }
    const out: { key: string; km: number; date: Date }[] = [];
    let cursor = startOfMonth(dataExtents.minDate);
    const end = startOfMonth(dataExtents.maxDate);
    while (cursor <= end) {
      const k = format(cursor, "yyyy-MM");
      out.push({ key: k, km: monthMap.get(k) ?? 0, date: cursor });
      cursor = addMonths(cursor, 1);
    }
    return out;
  }, [sessions, aggregates, dataExtents]);

  const years = useMemo(() => {
    if (!dataExtents.minDate || !dataExtents.maxDate) return [];
    const y0 = getYear(dataExtents.minDate);
    const y1 = getYear(dataExtents.maxDate);
    const arr: number[] = [];
    for (let y = y1; y >= y0; y--) arr.push(y);
    return arr.slice(0, 6); // cap to keep header tidy
  }, [dataExtents]);

  const focusedYear = useMemo(() => {
    if (trailingData.length === 0) return null;
    const first = trailingData[0].key.slice(0, 4);
    const last = trailingData[trailingData.length - 1].key.slice(0, 4);
    return first === last ? Number(first) : null;
  }, [trailingData]);

  const peakDate = useMemo(() => {
    if (sessions.length === 0 && aggregates.length === 0) return null;
    let bestKey: string | null = null;
    let bestKm = 0;
    for (const p of miniSeries) {
      if (p.km > bestKm) { bestKm = p.km; bestKey = p.key; }
    }
    if (!bestKey) return null;
    return new Date(bestKey + "-15T12:00:00");
  }, [miniSeries, sessions.length, aggregates.length]);

  const rangeLabel = useMemo(() => {
    if (trailingData.length === 0) return "";
    const first = trailingData[0];
    const last = trailingData[trailingData.length - 1];
    if (granularity === "year") return `${first.label} – ${last.label}`;
    const fmt = granularity === "month" ? "MMM yyyy" : "d MMM yyyy";
    const toDate = (key: string) => {
      if (granularity === "month") return new Date(key + "-01T12:00:00");
      return new Date(key + "T12:00:00");
    };
    return `${format(toDate(first.key), fmt)} – ${format(toDate(last.key), fmt)}`;
  }, [trailingData, granularity]);

  // ── Drag-to-pan on the chart container ───────────────────────────────
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startAnchor: number; bucketPx: number } | null>(null);

  const beginDrag = (clientX: number) => {
    if (mode !== "trailing" || trailingActive === 0 || !dataExtents.maxDate) return;
    const el = chartContainerRef.current;
    if (!el || trailingData.length === 0) return;
    const bucketPx = el.clientWidth / trailingData.length;
    const anchorMs = (anchorEnd ?? dataExtents.maxDate).getTime();
    dragRef.current = { startX: clientX, startAnchor: anchorMs, bucketPx };
  };
  const moveDrag = (clientX: number) => {
    if (!dragRef.current) return;
    const { startX, startAnchor, bucketPx } = dragRef.current;
    const dx = clientX - startX;
    const bucketsMoved = -dx / Math.max(1, bucketPx);
    const stepMs =
      granularity === "year" ? 365 * 86_400_000
      : granularity === "month" ? 30 * 86_400_000
      : 7 * 86_400_000;
    let next = startAnchor + bucketsMoved * stepMs;
    if (dataExtents.maxDate && next > dataExtents.maxDate.getTime()) next = dataExtents.maxDate.getTime();
    if (dataExtents.minDate) {
      const stepN =
        granularity === "year" ? trailingActive * 365 * 86_400_000
        : granularity === "month" ? trailingActive * 30 * 86_400_000
        : trailingActive * 7 * 86_400_000;
      const floor = dataExtents.minDate.getTime() + stepN;
      if (next < floor) next = Math.min(dataExtents.maxDate?.getTime() ?? Infinity, floor);
    }
    if (dataExtents.maxDate && next >= dataExtents.maxDate.getTime() - 1) setAnchorEnd(null);
    else setAnchorEnd(new Date(next));
  };
  const endDrag = () => { dragRef.current = null; };

  useEffect(() => {
    const move = (e: MouseEvent) => moveDrag(e.clientX);
    const up = () => endDrag();
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granularity, trailingActive, anchorEnd, trailingData.length]);




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

          {/* Overlay toggles: races (on by default) + injuries (off) */}
          <div className="flex gap-1 bg-muted rounded-lg p-1 ml-auto">
            <Button
              variant={showRaces ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5"
              onClick={() => setShowRaces((v) => !v)}
              title="Show race events from the Events page"
            >
              <Trophy className="h-3.5 w-3.5" />
              Races
            </Button>
            <Button
              variant={showInjuries ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5"
              onClick={() => setShowInjuries((v) => !v)}
              title="Shade injury / illness periods from the Events page"
            >
              <HeartPulse className="h-3.5 w-3.5" />
              Injuries
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  title="Overlay appearance"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-3 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Overlay appearance
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="race-color" className="text-xs flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5" style={{ color: raceColor }} />
                    Race color
                  </Label>
                  <input
                    id="race-color"
                    type="color"
                    value={raceColor}
                    onChange={(e) => setRaceColor(e.target.value)}
                    className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="injury-color" className="text-xs flex items-center gap-1.5">
                    <HeartPulse className="h-3.5 w-3.5" style={{ color: injuryColor }} />
                    Injury color
                  </Label>
                  <input
                    id="injury-color"
                    type="color"
                    value={injuryColor}
                    onChange={(e) => setInjuryColor(e.target.value)}
                    className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="injury-opacity" className="text-xs">
                      Injury band opacity
                    </Label>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {Math.round(injuryOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    id="injury-opacity"
                    type="range"
                    min={0.05}
                    max={0.6}
                    step={0.01}
                    value={injuryOpacity}
                    onChange={(e) => setInjuryOpacity(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  onClick={() => {
                    setRaceColor(DEFAULT_RACE_COLOR);
                    setInjuryColor(DEFAULT_INJURY_COLOR);
                    setInjuryOpacity(DEFAULT_INJURY_OPACITY);
                  }}
                >
                  Reset to defaults
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>



      <CardContent className="space-y-4">
        {mode === "trailing" && trailingActive !== 0 && (
          <ChartTimeNavigator
            granularity={granularity}
            windowSize={trailingActive === -1 ? Math.max(1, trailingData.length) : trailingActive}
            anchorEnd={anchorEnd}
            minDate={dataExtents.minDate}
            maxDate={dataExtents.maxDate}
            miniSeries={miniSeries}
            peakDate={peakDate}
            rangeLabel={rangeLabel}
            years={years}
            focusedYear={focusedYear}
            onAnchorChange={setAnchorEnd}
          />
        )}
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
          <span className="font-medium uppercase tracking-wide text-[10px] text-muted-foreground/70">
            Legend
          </span>
          {mode === "trailing" ? (
            <>
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
            </>
          ) : (
            <span>Lines combine Strava / .FIT with Garmin CSV backfill for months without sessions.</span>
          )}
          {showRaces && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ background: raceColor }}
                aria-hidden
              />
              <Trophy className="h-3 w-3" style={{ color: raceColor }} aria-hidden />
              Races
            </span>
          )}
          {showInjuries && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ background: injuryColor, opacity: Math.min(1, injuryOpacity * 4), border: `1px solid ${injuryColor}` }}
                aria-hidden
              />
              <HeartPulse className="h-3 w-3" style={{ color: injuryColor }} aria-hidden />
              Injury / illness
            </span>
          )}

        </div>


        <div
          ref={chartContainerRef}
          className={`h-72 w-full ${mode === "trailing" && trailingActive !== 0 ? "cursor-grab active:cursor-grabbing" : ""}`}
          onMouseDown={(e) => beginDrag(e.clientX)}
          onTouchStart={(e) => beginDrag(e.touches[0].clientX)}
          onTouchMove={(e) => moveDrag(e.touches[0].clientX)}
          onTouchEnd={endDrag}
          onWheel={(e) => {
            if (mode !== "trailing" || trailingActive === 0 || !dataExtents.maxDate) return;
            // Only respond to dominantly-horizontal wheel/trackpad swipes
            if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
            e.preventDefault();
            const stepMs =
              granularity === "year" ? 365 * 86_400_000
              : granularity === "month" ? 30 * 86_400_000
              : 7 * 86_400_000;
            const bucketsMoved = e.deltaX / 40; // ~one bucket per 40px swipe
            const base = (anchorEnd ?? dataExtents.maxDate).getTime();
            let next = base + bucketsMoved * stepMs;
            if (dataExtents.maxDate && next > dataExtents.maxDate.getTime()) next = dataExtents.maxDate.getTime();
            if (dataExtents.minDate) {
              const floor = dataExtents.minDate.getTime() + trailingActive * stepMs;
              if (next < floor) next = Math.min(dataExtents.maxDate.getTime(), floor);
            }
            if (dataExtents.maxDate && next >= dataExtents.maxDate.getTime() - 1) setAnchorEnd(null);
            else setAnchorEnd(new Date(next));
          }}
        >

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
                  radius={[4, 4, 0, 0]}
                >
                  {trailingData.map((b) => {
                    const isRace = showRaces && trailingOverlays.raceKeys.has(b.key);
                    return (
                      <Cell key={b.key} fill={isRace ? raceColor : "hsl(var(--primary))"} />
                    );
                  })}
                </Bar>
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

                {/* Interactive overlays — races + injury bands with native tooltips + click-through */}
                <Customized
                  component={makeEventOverlay({
                    injuries: showInjuries ? trailingOverlays.injuries : [],
                    races: showRaces ? trailingOverlays.races.map((r) => ({ ...r, color: raceColor })) : [],
                    raceColor,
                    injuryColor,
                    injuryOpacity,
                    onSelect: openEvent,
                  })}
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

                {/* Interactive overlays — current-year injury bands + per-year race markers */}
                <Customized
                  component={makeEventOverlay({
                    injuries: showInjuries ? compareOverlays.injuries : [],
                    races: showRaces ? compareOverlays.races : [],
                    raceColor,
                    injuryColor,
                    injuryOpacity,
                    onSelect: openEvent,
                  })}
                />

              </LineChart>

            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

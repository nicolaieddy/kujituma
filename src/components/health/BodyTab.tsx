import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Plus, TrendingDown, TrendingUp, Activity, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useBodyMeasurements } from "@/hooks/useBodyMeasurements";
import { useTrainingLoadByWeek } from "@/hooks/useTrainingLoadByWeek";
import { useMoodByDay } from "@/hooks/useMoodByDay";
import {
  BodyMeasurementChart,
  METRIC_LABEL,
  type BodyMetric,
} from "@/components/health/BodyMeasurementChart";
import { AddBodyMeasurementSheet } from "@/components/health/AddBodyMeasurementSheet";
import { parseLocalDate } from "@/utils/dateUtils";

const METRICS: BodyMetric[] = ["weight_kg", "body_fat_pct", "lean_mass_kg", "waist_cm", "resting_hr"];
const RANGE_DAYS = 90;

export function BodyTab() {
  const [metric, setMetric] = useState<BodyMetric>("weight_kg");
  const [showTraining, setShowTraining] = useState(true);
  const [showMood, setShowMood] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(parseLocalDate(today), RANGE_DAYS - 1), "yyyy-MM-dd");

  const { data: measurements = [], isLoading } = useBodyMeasurements(startDate, today);
  const { data: trainingLoad = [] } = useTrainingLoadByWeek(startDate, today);
  const { data: mood = [] } = useMoodByDay(startDate, today);

  const stats = useMemo(() => {
    const values = measurements
      .map((m) => ({ date: m.measured_on, v: (m as any)[metric] as number | null }))
      .filter((x) => x.v != null) as { date: string; v: number }[];
    if (values.length === 0) return null;

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const cutoff7 = format(subDays(parseLocalDate(today), 6), "yyyy-MM-dd");
    const cutoff30 = format(subDays(parseLocalDate(today), 29), "yyyy-MM-dd");
    const last7 = values.filter((x) => x.date >= cutoff7).map((x) => x.v);
    const last30 = values.filter((x) => x.date >= cutoff30).map((x) => x.v);

    const latest = values[values.length - 1].v;
    const baseline30 = values.find((x) => x.date <= cutoff30)?.v;
    const delta30 = baseline30 != null ? latest - baseline30 : null;

    return {
      latest,
      avg7: last7.length ? avg(last7) : null,
      avg30: last30.length ? avg(last30) : null,
      delta30,
    };
  }, [measurements, metric, today]);

  const fmt = (n: number | null | undefined) =>
    n == null ? "—" : Number.isFinite(n) ? (Math.round(n * 10) / 10).toString() : "—";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {METRICS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={`px-3 py-1.5 rounded-full text-xs leading-none transition-all ${
                metric === m
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {METRIC_LABEL[m]}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" /> Add measurement
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatTile label="Latest" value={fmt(stats?.latest)} />
        <StatTile label="7-day avg" value={fmt(stats?.avg7)} />
        <StatTile label="30-day avg" value={fmt(stats?.avg30)} />
        <StatTile
          label="vs 30 days ago"
          value={
            stats?.delta30 == null
              ? "—"
              : `${stats.delta30 > 0 ? "+" : ""}${fmt(stats.delta30)}`
          }
          icon={
            stats?.delta30 == null ? null : stats.delta30 < 0 ? (
              <TrendingDown className="h-4 w-4 text-primary" />
            ) : (
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            )
          }
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">{METRIC_LABEL[metric]} trend</CardTitle>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={showTraining} onCheckedChange={setShowTraining} />
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" /> Training load
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={showMood} onCheckedChange={setShowMood} />
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Smile className="h-3.5 w-3.5" /> Mood
                </span>
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-72 animate-pulse rounded-lg bg-muted/40" />
          ) : (
            <BodyMeasurementChart
              measurements={measurements}
              metric={metric}
              trainingLoad={trainingLoad}
              mood={mood}
              showTraining={showTraining}
              showMood={showMood}
            />
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Last {RANGE_DAYS} days · {measurements.length} measurement
            {measurements.length === 1 ? "" : "s"}
          </p>
        </CardContent>
      </Card>

      <AddBodyMeasurementSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-1.5 text-xl font-semibold tabular-nums">
        {value}
        {icon}
      </div>
    </div>
  );
}

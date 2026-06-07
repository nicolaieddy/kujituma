import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { parseLocalDate } from "@/utils/dateUtils";
import type { BodyMeasurement } from "@/hooks/useBodyMeasurements";
import type { WeeklyTrainingLoad } from "@/hooks/useTrainingLoadByWeek";
import type { DailyMoodPoint } from "@/hooks/useMoodByDay";

export type BodyMetric = "weight_kg" | "body_fat_pct" | "lean_mass_kg" | "waist_cm" | "resting_hr";

const METRIC_LABEL: Record<BodyMetric, string> = {
  weight_kg: "Weight (kg)",
  body_fat_pct: "Body fat %",
  lean_mass_kg: "Lean mass (kg)",
  waist_cm: "Waist (cm)",
  resting_hr: "Resting HR",
};

interface Props {
  measurements: BodyMeasurement[];
  metric: BodyMetric;
  trainingLoad?: WeeklyTrainingLoad[];
  mood?: DailyMoodPoint[];
  showTraining: boolean;
  showMood: boolean;
}

export function BodyMeasurementChart({
  measurements,
  metric,
  trainingLoad = [],
  mood = [],
  showTraining,
  showMood,
}: Props) {
  const data = useMemo(() => {
    // Build a daily index keyed by date so overlays line up
    const byDate = new Map<string, any>();

    measurements.forEach((m) => {
      const v = (m as any)[metric] as number | null;
      if (v == null) return;
      byDate.set(m.measured_on, {
        ...(byDate.get(m.measured_on) ?? { date: m.measured_on }),
        metric: v,
      });
    });

    if (showTraining) {
      trainingLoad.forEach((w) => {
        byDate.set(w.week_start, {
          ...(byDate.get(w.week_start) ?? { date: w.week_start }),
          training_km: w.total_km,
        });
      });
    }

    if (showMood) {
      mood.forEach((m) => {
        const avg =
          m.mood_rating != null && m.energy_level != null
            ? (m.mood_rating + m.energy_level) / 2
            : (m.mood_rating ?? m.energy_level);
        if (avg == null) return;
        byDate.set(m.check_in_date, {
          ...(byDate.get(m.check_in_date) ?? { date: m.check_in_date }),
          mood: Math.round(avg * 10) / 10,
        });
      });
    }

    return Array.from(byDate.values())
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((d) => ({ ...d, label: format(parseLocalDate(d.date), "d MMM") }));
  }, [measurements, metric, trainingLoad, mood, showTraining, showMood]);

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        No data yet — add your first measurement above.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            stroke="hsl(var(--primary))"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            width={44}
          />
          {(showTraining || showMood) && (
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
          )}
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {showTraining && (
            <Bar
              yAxisId="right"
              dataKey="training_km"
              name="Weekly km"
              fill="hsl(var(--muted-foreground))"
              fillOpacity={0.35}
              radius={[4, 4, 0, 0]}
            />
          )}
          {showMood && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="mood"
              name="Avg mood/energy"
              stroke="hsl(var(--accent-foreground))"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
            />
          )}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="metric"
            name={METRIC_LABEL[metric]}
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export { METRIC_LABEL };

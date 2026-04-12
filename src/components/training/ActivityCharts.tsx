import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from "recharts";
import type { ActivityLap } from "@/hooks/useActivityLaps";
import { cn } from "@/lib/utils";

/* ── Lap-based HR & Pace chart ─────────────────────────────── */

interface ActivityChartsProps {
  laps: ActivityLap[];
}

function paceFromSpeed(mps: number | null): number | null {
  if (!mps || mps === 0) return null;
  return 1000 / mps / 60; // min/km
}

function formatPaceLabel(minPerKm: number): string {
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ActivityCharts({ laps }: ActivityChartsProps) {
  const hasHr = laps.some(l => l.avg_heart_rate);
  const hasPace = laps.some(l => l.avg_speed);

  const chartData = useMemo(() => {
    return laps.map((lap) => {
      const pace = paceFromSpeed(lap.avg_speed);
      return {
        lap: lap.lap_index + 1,
        hr: lap.avg_heart_rate ? Math.round(lap.avg_heart_rate) : null,
        maxHr: lap.max_heart_rate ? Math.round(lap.max_heart_rate) : null,
        pace: pace ? Math.round(pace * 100) / 100 : null,
        power: lap.avg_power ? Math.round(lap.avg_power) : null,
      };
    });
  }, [laps]);

  if (!hasHr && !hasPace) return null;

  const paceValues = chartData.map(d => d.pace).filter((v): v is number => v != null);
  const paceMin = paceValues.length ? Math.floor(Math.min(...paceValues) * 10) / 10 - 0.2 : 3;
  const paceMax = paceValues.length ? Math.ceil(Math.max(...paceValues) * 10) / 10 + 0.2 : 8;
  const avgPace = paceValues.length ? paceValues.reduce((a, b) => a + b, 0) / paceValues.length : 0;

  return (
    <div className="space-y-4">
      {/* Heart Rate chart */}
      {hasHr && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50">
            Heart Rate by Lap
          </p>
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0 72% 51%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(0 72% 51%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis
                  dataKey="lap"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  domain={["dataMin - 5", "dataMax + 5"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: "0 4px 12px -2px rgba(0,0,0,.1)",
                  }}
                  formatter={(value: number, name: string) => [
                    `${value} bpm`,
                    name === "hr" ? "Avg HR" : "Max HR",
                  ]}
                  labelFormatter={(label) => `Lap ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="hr"
                  stroke="hsl(0 72% 51%)"
                  strokeWidth={2}
                  fill="url(#hrGrad)"
                  dot={{ r: 3, fill: "hsl(0 72% 51%)", strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }}
                />
                {chartData.some(d => d.maxHr) && (
                  <Area
                    type="monotone"
                    dataKey="maxHr"
                    stroke="hsl(0 72% 51%)"
                    strokeWidth={1}
                    strokeDasharray="4 2"
                    strokeOpacity={0.4}
                    fill="none"
                    dot={false}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Pace chart - bar chart with color coding */}
      {hasPace && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50">
            Pace by Lap
          </p>
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                <XAxis
                  dataKey="lap"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  domain={[paceMin, paceMax]}
                  reversed
                  tickFormatter={(v) => formatPaceLabel(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: "0 4px 12px -2px rgba(0,0,0,.1)",
                  }}
                  formatter={(value: number) => [formatPaceLabel(value) + " /km", "Pace"]}
                  labelFormatter={(label) => `Lap ${label}`}
                />
                <Bar dataKey="pace" radius={[3, 3, 0, 0]} maxBarSize={32}>
                  {chartData.map((entry, index) => {
                    const pace = entry.pace;
                    const isFast = pace != null && pace < avgPace * 0.97;
                    const isSlow = pace != null && pace > avgPace * 1.03;
                    return (
                      <Cell
                        key={index}
                        fill={isFast
                          ? "hsl(142 71% 45%)"
                          : isSlow
                            ? "hsl(0 72% 51% / 0.7)"
                            : "hsl(var(--primary) / 0.6)"
                        }
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

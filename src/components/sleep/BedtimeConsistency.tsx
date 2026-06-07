import { useMemo } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { parseLocalDate } from "@/utils/dateUtils";
import {
  bedtimeToMinutes,
  formatMinutes,
  isInBand,
  type SleepRangeStats,
} from "@/hooks/useSleepEntriesRange";

interface Props {
  stats: SleepRangeStats;
}

export function BedtimeConsistency({ stats }: Props) {
  const data = useMemo(
    () =>
      stats.rows
        .map((r) => {
          const bedMin = bedtimeToMinutes(r.bedtime);
          if (bedMin == null) return null;
          return {
            date: r.sleep_date,
            label: format(parseLocalDate(r.sleep_date), "d MMM"),
            bedMin,
            inBand: isInBand(bedMin),
          };
        })
        .filter((r): r is { date: string; label: string; bedMin: number; inBand: boolean } => r !== null),
    [stats.rows],
  );

  const yMin = stats.targetCenterMin - 180;
  const yMax = stats.targetCenterMin + 180;
  const bandTop = stats.targetCenterMin + stats.targetToleranceMin;
  const bandBottom = stats.targetCenterMin - stats.targetToleranceMin;

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No bedtimes recorded in this range yet.
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <ReferenceArea y1={bandBottom} y2={bandTop} fill="hsl(var(--primary))" fillOpacity={0.12} />
          <XAxis
            dataKey="label"
            type="category"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey="bedMin"
            domain={[yMin, yMax]}
            ticks={[yMin, bandBottom, stats.targetCenterMin, bandTop, yMax]}
            tickFormatter={(v) => formatMinutes(v) ?? ""}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) => [formatMinutes(value), "Bedtime"]}
            labelFormatter={(label, payload) => (payload?.[0]?.payload as any)?.label ?? label}
          />
          <Scatter
            data={data}
            shape={(props: any) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={payload.inBand ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                  fillOpacity={0.85}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

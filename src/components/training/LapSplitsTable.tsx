import type { ActivityLap } from "@/hooks/useActivityLaps";
import { formatDuration, formatDistance, formatPace } from "@/components/thisweek/trainingPlanUtils";
import { cn } from "@/lib/utils";

interface LapSplitsTableProps {
  laps: ActivityLap[];
}

function formatSpeed(metersPerSec: number | null): string {
  if (!metersPerSec || metersPerSec === 0) return "—";
  return formatPace(1000 / metersPerSec);
}

export function LapSplitsTable({ laps }: LapSplitsTableProps) {
  if (!laps.length) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50">
        Lap Splits
      </p>
      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border/40 bg-muted/20">
              <th className="px-2.5 py-1.5 text-left font-semibold text-muted-foreground/70">Lap</th>
              <th className="px-2.5 py-1.5 text-right font-semibold text-muted-foreground/70">Dist</th>
              <th className="px-2.5 py-1.5 text-right font-semibold text-muted-foreground/70">Time</th>
              <th className="px-2.5 py-1.5 text-right font-semibold text-muted-foreground/70">Pace</th>
              <th className="px-2.5 py-1.5 text-right font-semibold text-muted-foreground/70">HR</th>
              {laps.some(l => l.avg_cadence) && (
                <th className="px-2.5 py-1.5 text-right font-semibold text-muted-foreground/70">Cad</th>
              )}
              {laps.some(l => l.avg_power) && (
                <th className="px-2.5 py-1.5 text-right font-semibold text-muted-foreground/70">Power</th>
              )}
            </tr>
          </thead>
          <tbody>
            {laps.map((lap, i) => (
              <tr
                key={lap.id}
                className={cn(
                  "border-b border-border/20 last:border-0",
                  i % 2 === 0 ? "bg-card" : "bg-muted/10"
                )}
              >
                <td className="px-2.5 py-1.5 font-medium text-foreground/80">{lap.lap_index + 1}</td>
                <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-foreground/80">
                  {lap.distance_meters ? formatDistance(lap.distance_meters) : "—"}
                </td>
                <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-foreground/80">
                  {lap.duration_seconds ? formatDuration(lap.duration_seconds) : "—"}
                </td>
                <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-foreground/80">
                  {formatSpeed(lap.avg_speed)}
                </td>
                <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-foreground/80">
                  {lap.avg_heart_rate ? Math.round(lap.avg_heart_rate) : "—"}
                </td>
                {laps.some(l => l.avg_cadence) && (
                  <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-foreground/80">
                    {lap.avg_cadence ? Math.round(lap.avg_cadence) : "—"}
                  </td>
                )}
                {laps.some(l => l.avg_power) && (
                  <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-foreground/80">
                    {lap.avg_power ? `${Math.round(lap.avg_power)}W` : "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

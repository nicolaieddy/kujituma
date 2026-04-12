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

  // Compute pace range for visual bars
  const paces = laps
    .map(l => (l.avg_speed && l.avg_speed > 0) ? 1000 / l.avg_speed : null)
    .filter((v): v is number => v != null);
  const minPace = paces.length ? Math.min(...paces) : 0;
  const maxPace = paces.length ? Math.max(...paces) : 0;
  const paceRange = maxPace - minPace || 1;

  const hasCadence = laps.some(l => l.avg_cadence);
  const hasPower = laps.some(l => l.avg_power);
  const hasElevation = laps.some(l => l.total_elevation_gain);
  const hasGct = laps.some(l => (l as any).avg_ground_contact_time);

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
              <th className="px-2.5 py-1.5 text-right font-semibold text-muted-foreground/70 min-w-[100px]">Pace</th>
              <th className="px-2.5 py-1.5 text-right font-semibold text-muted-foreground/70">HR</th>
              {hasElevation && (
                <th className="px-2.5 py-1.5 text-right font-semibold text-muted-foreground/70">Elev</th>
              )}
              {hasCadence && (
                <th className="px-2.5 py-1.5 text-right font-semibold text-muted-foreground/70">Cad</th>
              )}
              {hasPower && (
                <th className="px-2.5 py-1.5 text-right font-semibold text-muted-foreground/70">Power</th>
              )}
              {hasGct && (
                <th className="px-2.5 py-1.5 text-right font-semibold text-muted-foreground/70">GCT</th>
              )}
            </tr>
          </thead>
          <tbody>
            {laps.map((lap, i) => {
              const pace = (lap.avg_speed && lap.avg_speed > 0) ? 1000 / lap.avg_speed : null;
              // Bar width: fastest = 100%, slowest = 30%
              const barWidth = pace != null
                ? 30 + (1 - (pace - minPace) / paceRange) * 70
                : 0;
              // Color: faster laps are greener
              const normalizedPace = pace != null ? (pace - minPace) / paceRange : 0.5;

              return (
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
                  <td className="px-2.5 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono tabular-nums text-foreground/80 shrink-0">
                        {formatSpeed(lap.avg_speed)}
                      </span>
                      {pace != null && (
                        <div className="w-[50px] h-[6px] rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: normalizedPace < 0.3
                                ? "hsl(142, 71%, 45%)"
                                : normalizedPace > 0.7
                                  ? "hsl(0, 72%, 51%, 0.7)"
                                  : "hsl(var(--primary) / 0.5)",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-foreground/80">
                    {lap.avg_heart_rate ? Math.round(lap.avg_heart_rate) : "—"}
                  </td>
                  {hasElevation && (
                    <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-foreground/80">
                      {lap.total_elevation_gain ? `+${Math.round(lap.total_elevation_gain)}m` : "—"}
                    </td>
                  )}
                  {hasCadence && (
                    <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-foreground/80">
                      {lap.avg_cadence ? Math.round(lap.avg_cadence) : "—"}
                    </td>
                  )}
                  {hasPower && (
                    <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-foreground/80">
                      {lap.avg_power ? `${Math.round(lap.avg_power)}W` : "—"}
                    </td>
                  )}
                  {hasGct && (
                    <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-foreground/80">
                      {(lap as any).avg_ground_contact_time ? `${Math.round((lap as any).avg_ground_contact_time)}ms` : "—"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

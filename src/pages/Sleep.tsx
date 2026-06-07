import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Moon, Flame, Clock, Bed, Sunrise, TrendingUp, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useSleepEntriesRange,
  bedtimeToMinutes,
  formatMinutes,
  isInBand,
} from "@/hooks/useSleepEntriesRange";
import { SleepScoreTrend } from "@/components/sleep/SleepScoreTrend";
import { BedtimeConsistency } from "@/components/sleep/BedtimeConsistency";
import { BulkFitUploadDialog } from "@/components/training/BulkFitUploadDialog";
import { parseLocalDate } from "@/utils/dateUtils";

type RangeKey = "7" | "30";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export default function Sleep() {
  const [range, setRange] = useState<RangeKey>("7");
  const days = range === "7" ? 7 : 30;

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const startDate = useMemo(
    () => format(subDays(parseLocalDate(today), days - 1), "yyyy-MM-dd"),
    [today, days],
  );

  const { data: stats, isLoading } = useSleepEntriesRange(startDate, today);

  const last14 = useMemo(() => {
    if (!stats) return [];
    return [...stats.rows].sort((a, b) => (a.sleep_date < b.sleep_date ? 1 : -1)).slice(0, 14);
  }, [stats]);

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Moon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sleep</h1>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <TabsList>
            <TabsTrigger value="7">Last 7 days</TabsTrigger>
            <TabsTrigger value="30">Last 30 days</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {/* Stat tiles */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <StatTile
          icon={<TrendingUp className="h-4 w-4" />}
          label="Avg score"
          value={stats?.avgScore != null ? Math.round(stats.avgScore).toString() : "—"}
          hint={stats?.totalNights ? `${stats.totalNights} nights` : undefined}
        />
        <StatTile
          icon={<Clock className="h-4 w-4" />}
          label="Avg duration"
          value={formatDuration(stats?.avgDurationSeconds ?? null)}
        />
        <StatTile
          icon={<Bed className="h-4 w-4" />}
          label="Avg bedtime"
          value={formatMinutes(stats?.avgBedtimeMinutes ?? null) ?? "—"}
        />
        <StatTile
          icon={<Sunrise className="h-4 w-4" />}
          label="Avg wake"
          value={formatMinutes(stats?.avgWakeMinutes ?? null) ?? "—"}
        />
        <StatTile
          icon={<Flame className="h-4 w-4 text-primary" />}
          label="Bedtime streak"
          value={stats ? `${stats.currentStreak}` : "—"}
          hint={stats ? `Best ${stats.bestStreak}` : undefined}
          accent
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sleep score trend</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-56 animate-pulse rounded-lg bg-muted/40" />
          ) : (
            <SleepScoreTrend rows={stats?.rows ?? []} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Bedtime consistency</CardTitle>
            {stats && (
              <p className="text-xs text-muted-foreground">
                Target {formatMinutes(stats.targetCenterMin)} ± {stats.targetToleranceMin} min
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="h-56 animate-pulse rounded-lg bg-muted/40" />
          ) : (
            stats && <BedtimeConsistency stats={stats} />
          )}
          {stats && stats.totalNights > 0 && (
            <p className="text-xs text-muted-foreground">
              {stats.inBandCount} of {days} nights inside target window.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent nights</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {last14.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No sleep entries yet. Import a Garmin sleep CSV from the Training Plan
              card to get started.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {last14.map((r) => {
                const bedMin = bedtimeToMinutes(r.bedtime);
                const inBand = isInBand(bedMin);
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm"
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        inBand ? "bg-primary" : "bg-destructive/70"
                      }`}
                      aria-hidden
                    />
                    <span className="w-24 shrink-0 text-muted-foreground">
                      {format(parseLocalDate(r.sleep_date), "EEE d MMM")}
                    </span>
                    <span className="w-20 shrink-0 tabular-nums">
                      {formatMinutes(bedMin) ?? "—"}
                    </span>
                    <span className="w-20 shrink-0 tabular-nums text-muted-foreground">
                      {formatDuration(r.duration_seconds)}
                    </span>
                    {r.score != null && (
                      <Badge variant="secondary" className="ml-auto">
                        {r.score}
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-card p-3 ${
        accent ? "border-primary/40 bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

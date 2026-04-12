import { useState } from "react";
import { Pencil, Trash2, Target, ChevronDown, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { TrainingPlanDisplayWorkout } from "@/components/thisweek/trainingPlanUtils";
import { formatDistance, formatDuration, formatPace, getWorkoutStatus } from "@/components/thisweek/trainingPlanUtils";
import { cn } from "@/lib/utils";

interface TrainingWorkoutCardProps {
  workout: TrainingPlanDisplayWorkout;
  matchedActivity: any;
  isReadOnly?: boolean;
  goalNames?: string[];
  onEdit?: () => void;
  onDelete?: () => void;
}

/* ── helpers ─────────────────────────────────────────────────── */

function formatSpeed(metersPerSec: number | null): string {
  if (!metersPerSec || metersPerSec === 0) return "";
  const secPerKm = 1000 / metersPerSec;
  return formatPace(secPerKm);
}

function timeDelta(plannedSeconds: number | null, actualSeconds: number | null): { text: string; positive: boolean } | null {
  if (!plannedSeconds || !actualSeconds) return null;
  const diff = actualSeconds - plannedSeconds;
  const absDiff = Math.abs(diff);
  const m = Math.floor(absDiff / 60);
  const label = diff <= 0 ? `−${m}m` : `+${m}m`;
  return { text: label, positive: diff <= 0 };
}

function StatusBadge({ status }: { status: "done" | "missed" | "upcoming" }) {
  if (status === "done") {
    return (
      <Badge className="border-success/30 bg-success/15 text-success-foreground gap-1 font-medium">
        <Check className="h-3 w-3" /> Done
      </Badge>
    );
  }
  if (status === "missed") {
    return (
      <Badge variant="destructive" className="gap-1 font-medium">
        <X className="h-3 w-3" /> Missed
      </Badge>
    );
  }
  return <Badge variant="secondary" className="font-medium">Upcoming</Badge>;
}

/* ── Planned column ──────────────────────────────────────────── */

function PlannedColumn({ workout }: { workout: TrainingPlanDisplayWorkout }) {
  const rows: { label: string; value: string }[] = [];

  if (workout.target_duration_seconds) rows.push({ label: "Duration", value: formatDuration(workout.target_duration_seconds) });
  if (workout.target_distance_meters) rows.push({ label: "Distance", value: formatDistance(workout.target_distance_meters) });
  if (workout.target_pace_per_km) rows.push({ label: "Target pace", value: formatPace(workout.target_pace_per_km) });
  if (workout.workout_type) rows.push({ label: "Type", value: workout.workout_type });

  return (
    <div className="flex-1 min-w-0 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Planned
      </p>
      {rows.length > 0 ? (
        <dl className="space-y-1.5">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-baseline justify-between gap-2 text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium text-foreground text-right">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground italic">No targets set</p>
      )}
      {workout.description && (
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap pt-1 border-t border-border">
          {workout.description}
        </p>
      )}
    </div>
  );
}

/* ── Actual / Strava column ──────────────────────────────────── */

function ActualColumn({ workout, activity }: { workout: TrainingPlanDisplayWorkout; activity: any }) {
  const status = getWorkoutStatus(workout, activity);
  const isMissed = status === "missed";

  if (!activity) {
    return (
      <div className={cn(
        "flex-1 min-w-0 rounded-xl p-3 space-y-3",
        isMissed ? "bg-destructive/8 border border-destructive/20" : "bg-muted/30 border border-border"
      )}>
        <p className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.2em]",
          isMissed ? "text-destructive" : "text-muted-foreground"
        )}>
          Actual · Strava
        </p>
        <p className={cn(
          "text-sm",
          isMissed ? "text-destructive/80" : "text-muted-foreground"
        )}>
          {isMissed ? "No activity found for this session." : "Activity not yet recorded."}
        </p>
      </div>
    );
  }

  const delta = timeDelta(workout.target_duration_seconds, activity.duration_seconds);

  // 5 key highlights
  const highlights: { label: string; value: string; delta?: { text: string; positive: boolean } | null }[] = [
    {
      label: "Moving time",
      value: activity.duration_seconds ? formatDuration(activity.duration_seconds) : "—",
      delta,
    },
    { label: "Distance", value: activity.distance_meters ? formatDistance(activity.distance_meters) : "—" },
    { label: "Avg HR", value: activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : "—" },
    { label: "Avg pace", value: activity.average_speed ? formatSpeed(activity.average_speed) : "—" },
    { label: "Elev gain", value: activity.total_elevation_gain ? `+${Math.round(activity.total_elevation_gain)} m` : "—" },
  ];

  return (
    <div className="flex-1 min-w-0 rounded-xl bg-success/8 border border-success/20 p-3 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-success-foreground/80">
        Actual · Strava
      </p>
      <dl className="space-y-1.5">
        {highlights.map(({ label, value, delta: d }) => (
          <div key={label} className="flex items-baseline justify-between gap-2 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground text-right flex items-baseline gap-1.5">
              <span>{value}</span>
              {d && (
                <span className={cn(
                  "text-xs font-medium",
                  d.positive ? "text-success-foreground" : "text-destructive"
                )}>
                  {d.text}
                  {d.positive && " ✓"}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {/* Strava activity description */}
      {activity.strava_description && (
        <div className="rounded-lg bg-success/10 border-l-2 border-success/40 px-3 py-2">
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {activity.strava_description}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Extended breakdown (collapsible) ────────────────────────── */

function FullBreakdown({ workout, activity }: { workout: TrainingPlanDisplayWorkout; activity: any }) {
  const stravaExtras: { label: string; value: string }[] = [];
  const coachExtras: string[] = [];

  if (activity) {
    if (activity.max_heartrate) stravaExtras.push({ label: "Max HR", value: `${Math.round(activity.max_heartrate)} bpm` });
    if (activity.max_speed) stravaExtras.push({ label: "Max pace", value: formatSpeed(activity.max_speed) });
    if (activity.average_cadence) stravaExtras.push({ label: "Cadence", value: `${Math.round(activity.average_cadence)} spm` });
    if (activity.calories) stravaExtras.push({ label: "Calories", value: `${Math.round(activity.calories)} kcal` });
    if (activity.suffer_score) stravaExtras.push({ label: "Suffer score", value: `${activity.suffer_score}` });
    if (activity.elapsed_time_seconds && activity.duration_seconds) {
      const rest = activity.elapsed_time_seconds - activity.duration_seconds;
      if (rest > 60) stravaExtras.push({ label: "Rest / stopped", value: formatDuration(rest) });
    }
    if (activity.activity_name) stravaExtras.push({ label: "Activity name", value: activity.activity_name });
  }

  if (workout.notes) coachExtras.push(workout.notes);

  if (stravaExtras.length === 0 && coachExtras.length === 0) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2 pt-2">
      {coachExtras.length > 0 && (
        <section className="rounded-xl border border-border bg-background/70 p-3 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Coach Notes</p>
          {coachExtras.map((note, i) => (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{note}</p>
          ))}
        </section>
      )}
      {stravaExtras.length > 0 && (
        <section className="rounded-xl border border-success/20 bg-success/5 p-3 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Strava Details</p>
          <dl className="space-y-1">
            {stravaExtras.map(({ label, value }) => (
              <div key={label} className="flex items-baseline justify-between gap-2 text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}

/* ── Main card ───────────────────────────────────────────────── */

export function TrainingWorkoutCard({
  workout,
  matchedActivity,
  isReadOnly = false,
  goalNames = [],
  onEdit,
  onDelete,
}: TrainingWorkoutCardProps) {
  const [expanded, setExpanded] = useState(false);
  const status = getWorkoutStatus(workout, matchedActivity);

  const hasBreakdown = (() => {
    if (workout.notes) return true;
    if (!matchedActivity) return false;
    return !!(matchedActivity.max_heartrate || matchedActivity.max_speed || matchedActivity.average_cadence ||
      matchedActivity.calories || matchedActivity.suffer_score || matchedActivity.activity_name);
  })();

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card/80 shadow-sm transition-colors",
        status === "done" && "border-success/25",
        status === "missed" && "border-destructive/20",
        workout.isDerivedSession && "border-accent-foreground/10 bg-accent/40"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h4 className="font-semibold text-foreground">{workout.title || workout.workout_type}</h4>
          <Badge variant="outline" className="bg-background/80">{workout.workout_type}</Badge>
          {workout.sessionLabel && (
            <Badge variant="outline" className="border-primary/20 bg-accent text-accent-foreground">
              {workout.sessionLabel}
            </Badge>
          )}
          <StatusBadge status={status} />
        </div>

        {!isReadOnly && !workout.isDerivedSession && (onEdit || onDelete) && (
          <div className="flex shrink-0 gap-1">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-8 w-8 min-h-0 min-w-0" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-8 w-8 min-h-0 min-w-0 text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Goal tags */}
      {goalNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2">
          <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {goalNames.map(name => (
            <Badge key={name} variant="secondary" className="text-xs font-normal">{name}</Badge>
          ))}
        </div>
      )}

      {/* Two-column: Plan vs Actual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 pb-3">
        <PlannedColumn workout={workout} />
        <ActualColumn workout={workout} activity={matchedActivity} />
      </div>

      {/* Show full breakdown toggle */}
      {hasBreakdown && (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
              <span>{expanded ? "Hide full breakdown" : "Show full breakdown"}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4">
              <FullBreakdown workout={workout} activity={matchedActivity} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </article>
  );
}

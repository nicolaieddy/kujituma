import { useState } from "react";
import { Pencil, Trash2, Target, ChevronDown, Check, X, Clock, Activity, Heart, Gauge, Mountain, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { TrainingPlanDisplayWorkout } from "@/components/thisweek/trainingPlanUtils";
import { formatDistance, formatDuration, formatPace, getWorkoutStatus } from "@/components/thisweek/trainingPlanUtils";
import { cn } from "@/lib/utils";
import { FitUploadButton } from "@/components/training/FitUploadButton";
import { useActivityLaps } from "@/hooks/useActivityLaps";
import { LapSplitsTable } from "@/components/training/LapSplitsTable";

interface TrainingWorkoutCardProps {
  workout: TrainingPlanDisplayWorkout;
  matchedActivity: any;
  isReadOnly?: boolean;
  goalNames?: string[];
  onEdit?: () => void;
  onDelete?: () => void;
}

function formatSpeed(metersPerSec: number | null): string {
  if (!metersPerSec || metersPerSec === 0) return "";
  return formatPace(1000 / metersPerSec);
}

function timeDelta(plannedSeconds: number | null, actualSeconds: number | null): { text: string; positive: boolean } | null {
  if (!plannedSeconds || !actualSeconds) return null;
  const diff = actualSeconds - plannedSeconds;
  const absDiff = Math.abs(diff);
  const m = Math.floor(absDiff / 60);
  if (m === 0) return { text: "+0m", positive: true };
  return { text: diff <= 0 ? `−${m}m` : `+${m}m`, positive: diff <= 0 };
}

function StatusPill({ status }: { status: "done" | "missed" | "upcoming" }) {
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800">
        <Check className="h-3 w-3" /> Done
      </span>
    );
  }
  if (status === "missed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-800">
        <X className="h-3 w-3" /> Missed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted/40 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-border">
      Upcoming
    </span>
  );
}

/* ── Highlight stat item ────────────────────────────────────── */

function HighlightStat({ icon: Icon, label, value, delta, muted }: {
  icon: React.ElementType;
  label: string;
  value: string;
  delta?: { text: string; positive: boolean } | null;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        muted ? "bg-muted/20" : "bg-primary/8"
      )}>
        <Icon className={cn("h-3.5 w-3.5", muted ? "text-muted-foreground/60" : "text-primary/70")} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground/70 leading-none mb-0.5">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className={cn("text-sm font-semibold", muted ? "text-muted-foreground" : "text-foreground")}>{value}</span>
          {delta && (
            <span className={cn(
              "text-[11px] font-semibold",
              delta.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
            )}>
              {delta.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Plan side ──────────────────────────────────────────────── */

function PlanSection({ workout }: { workout: TrainingPlanDisplayWorkout }) {
  const details: { label: string; value: string }[] = [];
  if (workout.target_duration_seconds) details.push({ label: "Duration", value: formatDuration(workout.target_duration_seconds) });
  if (workout.target_distance_meters) details.push({ label: "Distance", value: formatDistance(workout.target_distance_meters) });
  if (workout.target_pace_per_km) details.push({ label: "Target pace", value: formatPace(workout.target_pace_per_km) });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-primary/50" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">Plan</span>
      </div>

      {details.length > 0 ? (
        <div className="space-y-2">
          {details.map(({ label, value }) => (
            <div key={label} className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground/80">{label}</span>
              <span className="font-mono text-[13px] font-medium text-foreground tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] italic text-muted-foreground/50">No targets set</p>
      )}

      {workout.description && (
        <p className="text-[13px] leading-relaxed text-muted-foreground/80 whitespace-pre-wrap">
          {workout.description}
        </p>
      )}
    </div>
  );
}

/* ── Actual side ────────────────────────────────────────────── */

function ActualSection({ workout, activity }: { workout: TrainingPlanDisplayWorkout; activity: any }) {
  const status = getWorkoutStatus(workout, activity);

  if (!activity) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className={cn("h-1 w-1 rounded-full", status === "missed" ? "bg-red-400" : "bg-muted-foreground/30")} />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">Actual</span>
        </div>
        <div className={cn(
          "rounded-xl px-4 py-5 text-center",
          status === "missed"
            ? "bg-red-50/60 dark:bg-red-950/20"
            : "bg-muted/15"
        )}>
          <p className={cn(
            "text-[13px]",
            status === "missed" ? "text-red-500/80 dark:text-red-400/80" : "text-muted-foreground/50"
          )}>
            {status === "missed" ? "No activity recorded" : "Not yet recorded"}
          </p>
        </div>
      </div>
    );
  }

  const delta = timeDelta(workout.target_duration_seconds, activity.duration_seconds);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-emerald-500" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">Actual</span>
      </div>

      <div className="space-y-2.5">
        <HighlightStat icon={Clock} label="Moving time" value={activity.duration_seconds ? formatDuration(activity.duration_seconds) : "—"} delta={delta} />
        <HighlightStat icon={Activity} label="Distance" value={activity.distance_meters ? formatDistance(activity.distance_meters) : "—"} />
        <HighlightStat icon={Heart} label="Avg HR" value={activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : "—"} muted={!activity.average_heartrate} />
        <HighlightStat icon={Gauge} label="Avg pace" value={activity.average_speed ? formatSpeed(activity.average_speed) : "—"} muted={!activity.average_speed} />
        <HighlightStat icon={Mountain} label="Elev gain" value={activity.total_elevation_gain ? `+${Math.round(activity.total_elevation_gain)} m` : "—"} muted={!activity.total_elevation_gain} />
      </div>

      {activity.strava_description && (
        <p className="rounded-lg bg-muted/15 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground/70 italic">
          "{activity.strava_description}"
        </p>
      )}
    </div>
  );
}

/* ── Expanded breakdown ──────────────────────────────────────── */

function FullBreakdown({ workout, activity }: { workout: TrainingPlanDisplayWorkout; activity: any }) {
  const extras: { label: string; value: string }[] = [];

  if (activity) {
    if (activity.max_heartrate) extras.push({ label: "Max HR", value: `${Math.round(activity.max_heartrate)} bpm` });
    if (activity.max_speed) extras.push({ label: "Max pace", value: formatSpeed(activity.max_speed) });
    if (activity.average_cadence) extras.push({ label: "Cadence", value: `${Math.round(activity.average_cadence)} spm` });
    if (activity.calories) extras.push({ label: "Calories", value: `${Math.round(activity.calories)} kcal` });
    if (activity.suffer_score) extras.push({ label: "Suffer score", value: `${activity.suffer_score}` });
    if (activity.elapsed_time_seconds && activity.duration_seconds) {
      const rest = activity.elapsed_time_seconds - activity.duration_seconds;
      if (rest > 60) extras.push({ label: "Rest / stopped", value: formatDuration(rest) });
    }
    if (activity.activity_name) extras.push({ label: "Activity", value: activity.activity_name });
  }

  const hasNotes = !!workout.notes;
  if (extras.length === 0 && !hasNotes) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 pt-1">
      {hasNotes && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50">Coach Notes</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground/80 whitespace-pre-wrap">{workout.notes}</p>
        </div>
      )}
      {extras.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50">Extended Stats</p>
          <div className="space-y-1">
            {extras.map(({ label, value }) => (
              <div key={label} className="flex items-baseline justify-between text-[13px]">
                <span className="text-muted-foreground/70">{label}</span>
                <span className="font-mono font-medium text-foreground/80 tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
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
  const { data: laps = [] } = useActivityLaps(matchedActivity?.id || null);

  const hasBreakdown = (() => {
    if (workout.notes) return true;
    if (laps.length > 0) return true;
    if (!matchedActivity) return false;
    return !!(matchedActivity.max_heartrate || matchedActivity.max_speed || matchedActivity.average_cadence ||
      matchedActivity.calories || matchedActivity.suffer_score || matchedActivity.activity_name);
  })();

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card transition-all duration-200",
        status === "done" && "border-emerald-200/60 dark:border-emerald-800/40",
        status === "missed" && "border-red-200/50 dark:border-red-800/30",
        status === "upcoming" && "border-border",
        workout.isDerivedSession && "bg-accent/30",
        "hover:shadow-md"
      )}
    >
      {/* Subtle left accent */}
      <div className={cn(
        "absolute inset-y-0 left-0 w-[3px]",
        status === "done" && "bg-emerald-500/60",
        status === "missed" && "bg-red-400/50",
        status === "upcoming" && "bg-muted-foreground/15"
      )} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-1">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h4 className="text-[15px] font-semibold text-foreground leading-tight">
            {workout.title || workout.workout_type}
          </h4>
          <Badge variant="outline" className="rounded-md bg-muted/20 text-[11px] font-medium text-muted-foreground border-border/60">
            {workout.workout_type}
          </Badge>
          {workout.sessionLabel && (
            <Badge variant="outline" className="rounded-md border-primary/25 bg-primary/8 text-primary text-[11px] font-semibold">
              {workout.sessionLabel}
            </Badge>
          )}
          {matchedActivity && (
            <Badge
              variant="outline"
              className={cn(
                "rounded-md text-[10px] font-semibold gap-1",
                matchedActivity.source === "fit_upload"
                  ? "border-orange-300/60 bg-orange-50/60 text-orange-700 dark:border-orange-700/40 dark:bg-orange-950/30 dark:text-orange-400"
                  : "border-blue-300/60 bg-blue-50/60 text-blue-700 dark:border-blue-700/40 dark:bg-blue-950/30 dark:text-blue-400"
              )}
            >
              {matchedActivity.source === "fit_upload" ? (
                <><FileUp className="h-3 w-3" /> .FIT</>
              ) : (
                <><Activity className="h-3 w-3" /> Strava</>
              )}
            </Badge>
          )}
          <StatusPill status={status} />
        </div>

        {!isReadOnly && !workout.isDerivedSession && (
          <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <FitUploadButton workoutId={workout.id} variant="ghost" size="icon" />
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Goal tags */}
      {goalNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-5 pb-2">
          <Target className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          {goalNames.map(name => (
            <span key={name} className="rounded-md bg-muted/20 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{name}</span>
          ))}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border/40 mx-5 mb-3 rounded-xl overflow-hidden border border-border/50">
        <div className="bg-card p-4">
          <PlanSection workout={workout} />
        </div>
        <div className={cn(
          "p-4",
          status === "done" && "bg-emerald-50/30 dark:bg-emerald-950/10",
          status === "missed" && "bg-red-50/20 dark:bg-red-950/10",
          status === "upcoming" && "bg-card"
        )}>
          <ActualSection workout={workout} activity={matchedActivity} />
        </div>
      </div>

      {/* Full breakdown toggle */}
      {hasBreakdown && (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium text-muted-foreground/60 hover:text-muted-foreground transition-colors border-t border-border/40">
              {expanded ? "Hide breakdown" : "Show full breakdown"}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-5 pb-4 space-y-4">
              <FullBreakdown workout={workout} activity={matchedActivity} />
              {laps.length > 0 && <LapSplitsTable laps={laps} />}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </article>
  );
}

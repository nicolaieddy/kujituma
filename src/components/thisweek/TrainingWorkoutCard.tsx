import { useState, memo } from "react";
import { Pencil, Trash2, ChevronDown, Check, X, Clock, Activity, Heart, Gauge, Mountain, File, Target, FileX, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TrainingPlanDisplayWorkout, MergedSession } from "@/components/thisweek/trainingPlanUtils";
import { formatDistance, formatDuration, formatPace, getWorkoutStatus, mergeActivitiesIntoSessions } from "@/components/thisweek/trainingPlanUtils";
import { cn } from "@/lib/utils";
import { useActivityLaps } from "@/hooks/useActivityLaps";
import { LapSplitsTable } from "@/components/training/LapSplitsTable";
import { ActivityCharts } from "@/components/training/ActivityCharts";
import { ActivityReflection } from "@/components/training/ActivityReflection";

interface TrainingWorkoutCardProps {
  workout: TrainingPlanDisplayWorkout;
  matchedActivity: any;
  matchedActivities?: any[];
  isReadOnly?: boolean;
  goalNames?: string[];
  onEdit?: () => void;
  onDelete?: () => void;
  onDeleteActivity?: (activityId: string) => void;
  isDeletingActivity?: boolean;
  sourceImportId?: string | null;
  onViewSource?: (importId: string) => void;
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

type Tone = "good" | "warn" | "bad";
const toneTextClass: Record<Tone, string> = {
  good: "text-emerald-500 dark:text-emerald-400",
  warn: "text-amber-500 dark:text-amber-400",
  bad: "text-red-500 dark:text-red-400",
};
const toneDotClass: Record<Tone, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-red-500",
};

function distanceDelta(plannedM?: number | null, actualM?: number | null): { text: string; tone: Tone } | null {
  if (!plannedM || !actualM) return null;
  const diffKm = (actualM - plannedM) / 1000;
  const abs = Math.abs(diffKm);
  const pct = abs / (plannedM / 1000);
  if (abs < 0.05) return { text: "on plan", tone: "good" };
  const sign = diffKm > 0 ? "+" : "−";
  const tone: Tone = pct < 0.05 ? "good" : pct < 0.15 ? "warn" : "bad";
  return { text: `${sign}${abs.toFixed(abs >= 1 ? 1 : 2)}km`, tone };
}

function paceDelta(plannedSecPerKm?: number | null, actualSecPerKm?: number | null): { text: string; tone: Tone } | null {
  if (!plannedSecPerKm || !actualSecPerKm) return null;
  const diff = Math.round(actualSecPerKm - plannedSecPerKm); // positive = slower than plan
  const abs = Math.abs(diff);
  if (abs <= 2) return { text: "on pace", tone: "good" };
  const sign = diff < 0 ? "▾" : "▴"; // faster down, slower up
  const min = Math.floor(abs / 60);
  const sec = abs % 60;
  const text = min > 0 ? `${sign}${min}:${String(sec).padStart(2, "0")}` : `${sign}${sec}s`;
  const tone: Tone = abs <= 5 ? "good" : abs <= 15 ? "warn" : "bad";
  return { text, tone };
}

function planSummary(w: TrainingPlanDisplayWorkout): string | null {
  const parts: string[] = [];
  if (w.target_distance_meters) parts.push(formatDistance(w.target_distance_meters));
  else if (w.target_duration_seconds) parts.push(formatDuration(w.target_duration_seconds));
  if (w.target_pace_per_km) parts.push(`@ ${formatPace(w.target_pace_per_km)}`);
  return parts.length ? parts.join(" ") : null;
}

/* ── Inline stat chip (used in expanded session view) ──────────── */

function InlineStat({ icon: Icon, value, delta, className }: {
  icon: React.ElementType;
  value: string;
  delta?: { text: string; positive: boolean } | null;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <Icon className="h-3 w-3 shrink-0" />
      <span className="font-medium text-foreground tabular-nums">{value}</span>
      {delta && (
        <span className={cn(
          "text-[10px] font-semibold",
          delta.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
        )}>
          {delta.text}
        </span>
      )}
    </span>
  );
}

/* ── Expanded detail section ────────────────────────────────── */

function ExpandedDetail({ workout, activity, laps }: {
  workout: TrainingPlanDisplayWorkout;
  activity: any;
  laps: any[];
}) {
  const planDetails: { label: string; value: string }[] = [];
  if (workout.target_duration_seconds) planDetails.push({ label: "Duration", value: formatDuration(workout.target_duration_seconds) });
  if (workout.target_distance_meters) planDetails.push({ label: "Distance", value: formatDistance(workout.target_distance_meters) });
  if (workout.target_pace_per_km) planDetails.push({ label: "Target pace", value: formatPace(workout.target_pace_per_km) });

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
  }

  return (
    <div className="px-4 pb-4 pt-1 space-y-4">
      {/* Plan + Description */}
      {(planDetails.length > 0 || workout.description) && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">Plan</p>
          {planDetails.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {planDetails.map(({ label, value }) => (
                <span key={label} className="text-xs text-muted-foreground">
                  {label}: <span className="font-medium text-foreground tabular-nums">{value}</span>
                </span>
              ))}
            </div>
          )}
          {workout.description && (
            <p className="text-xs leading-relaxed text-muted-foreground/80 whitespace-pre-wrap">{workout.description}</p>
          )}
        </div>
      )}

      {/* Extended stats */}
      {extras.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">Extended Stats</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
            {extras.map(({ label, value }) => (
              <span key={label} className="text-xs text-muted-foreground">
                {label}: <span className="font-medium text-foreground tabular-nums">{value}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Coach notes */}
      {workout.notes && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">Coach Notes</p>
          <p className="text-xs leading-relaxed text-muted-foreground/80 whitespace-pre-wrap">{workout.notes}</p>
        </div>
      )}

      {/* Strava description */}
      {activity?.strava_description && (
        <p className="rounded-lg bg-muted/15 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground/70 italic">
          "{activity.strava_description}"
        </p>
      )}

      {/* Charts & Laps */}
      {laps.length > 0 && <ActivityCharts laps={laps} />}
      {laps.length > 0 && <LapSplitsTable laps={laps} />}
    </div>
  );
}

/* ── Single session expanded (used for single-activity workouts) ──── */

function SingleSessionExpanded({ workout, session, onDeleteActivity, confirmDeleteId, setConfirmDeleteId, isDeletingActivity }: {
  workout: TrainingPlanDisplayWorkout;
  session: MergedSession | null;
  onDeleteActivity?: (id: string) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  isDeletingActivity?: boolean;
}) {
  const activity = session?.displayActivity || null;
  const { data: laps = [] } = useActivityLaps(session?.lapsActivityId || null);
  const fitActivities = session?.activities.filter(a => a.source === "fit_upload") || [];

  return (
    <>
      <ExpandedDetail workout={workout} activity={activity} laps={laps} />
      {activity && (
        <div className="px-4 pb-4">
          <ActivityReflection activityId={activity.id} reflection={activity.reflection} />
        </div>
      )}
      {fitActivities.length > 0 && onDeleteActivity && (
        <div className="px-4 pb-4 border-t border-border/40 pt-3">
          {fitActivities.map(fitAct => (
            <div key={fitAct.id}>
              {confirmDeleteId !== fitAct.id ? (
                <Button
                  variant="ghost" size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1"
                  onClick={() => setConfirmDeleteId(fitAct.id)}
                  disabled={isDeletingActivity}
                >
                  <FileX className="h-3 w-3" />
                  Delete .FIT data
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-destructive">Delete all .FIT data (laps, streams, file)?</p>
                  <Button variant="destructive" size="sm" className="h-7 text-xs"
                    onClick={() => { onDeleteActivity(fitAct.id); setConfirmDeleteId(null); }}
                    disabled={isDeletingActivity}
                  >
                    {isDeletingActivity ? "Deleting..." : "Confirm"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ── Session section (for multi-session workouts) ──────────────── */

function SessionSection({ session, sessionIndex, totalSessions, onDeleteActivity, confirmDeleteId, setConfirmDeleteId, isDeletingActivity }: {
  session: MergedSession;
  sessionIndex: number;
  totalSessions: number;
  onDeleteActivity?: (id: string) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  isDeletingActivity?: boolean;
}) {
  const { data: laps = [] } = useActivityLaps(session.lapsActivityId);
  const activity = session.displayActivity;
  const fitActivities = session.activities.filter(a => a.source === "fit_upload");

  return (
    <div className="rounded-lg border border-border/40 bg-muted/10 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Session {sessionIndex + 1} of {totalSessions}
          </span>
          {session.sources.map((source: string) => (
            <Badge
              key={source}
              variant="outline"
              className={cn(
                "rounded-md text-[10px] px-1.5 py-0 h-5 font-medium gap-0.5",
                source === "fit_upload"
                  ? "border-warning/30 bg-warning/10 text-warning-foreground"
                  : "border-primary/30 bg-primary/10 text-primary"
              )}
            >
              {source === "fit_upload" ? (
                <><File className="h-2.5 w-2.5" />.FIT</>
              ) : (
                <><Activity className="h-2.5 w-2.5" />Strava</>
              )}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {activity.duration_seconds && (
            <InlineStat icon={Clock} value={formatDuration(activity.duration_seconds)} />
          )}
          {activity.distance_meters && (
            <InlineStat icon={Activity} value={formatDistance(activity.distance_meters)} />
          )}
          {activity.average_speed && (
            <InlineStat icon={Gauge} value={formatSpeed(activity.average_speed)} />
          )}
          {activity.average_heartrate && (
            <InlineStat icon={Heart} value={`${Math.round(activity.average_heartrate)}`} />
          )}
          {activity.total_elevation_gain > 0 && (
            <InlineStat icon={Mountain} value={`+${Math.round(activity.total_elevation_gain)}m`} />
          )}
        </div>
      </div>

      {laps.length > 0 && (
        <div className="px-3 pb-3 pt-2 space-y-3">
          <ActivityCharts laps={laps} />
          <LapSplitsTable laps={laps} />
        </div>
      )}

      <div className="px-3 pb-3 pt-2">
        <ActivityReflection activityId={activity.id} reflection={activity.reflection} />
      </div>

      {fitActivities.length > 0 && onDeleteActivity && (
        <div className="px-3 pb-2 border-t border-border/30 pt-2">
          {fitActivities.map(fitAct => (
            <div key={fitAct.id}>
              {confirmDeleteId !== fitAct.id ? (
                <Button variant="ghost" size="sm"
                  className="h-6 text-[11px] text-muted-foreground hover:text-destructive gap-1"
                  onClick={() => setConfirmDeleteId(fitAct.id)}
                  disabled={isDeletingActivity}
                >
                  <FileX className="h-3 w-3" /> Delete .FIT data
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-destructive">Delete this .FIT data?</p>
                  <Button variant="destructive" size="sm" className="h-6 text-[11px]"
                    onClick={() => { onDeleteActivity(fitAct.id); setConfirmDeleteId(null); }}
                    disabled={isDeletingActivity}
                  >
                    Confirm
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[11px]"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main card ───────────────────────────────────────────────── */

export const TrainingWorkoutCard = memo(function TrainingWorkoutCard({
  workout,
  matchedActivity,
  matchedActivities = [],
  isReadOnly = false,
  goalNames = [],
  onEdit,
  onDelete,
  onDeleteActivity,
  isDeletingActivity,
  sourceImportId = null,
  onViewSource,
}: TrainingWorkoutCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDeleteActivity, setConfirmDeleteActivity] = useState<string | null>(null);
  const isRest = workout.workout_type === "Rest";
  const activities = matchedActivities.length > 0 ? matchedActivities : matchedActivity ? [matchedActivity] : [];
  const sessions = mergeActivitiesIntoSessions(activities);
  const primaryActivity = sessions[0]?.displayActivity || null;
  const isMultiSession = sessions.length > 1;
  const status = getWorkoutStatus(workout, primaryActivity);

  // Aggregate stats across all sessions (use session displayActivities, not raw activities)
  const sessionDisplays = sessions.map(s => s.displayActivity);
  const aggregated = isMultiSession ? {
    duration_seconds: sessionDisplays.reduce((s: number, a: any) => s + (a.duration_seconds || 0), 0),
    distance_meters: sessionDisplays.reduce((s: number, a: any) => s + (a.distance_meters || 0), 0),
    total_elevation_gain: sessionDisplays.reduce((s: number, a: any) => s + (a.total_elevation_gain || 0), 0),
    average_heartrate: (() => {
      const weighted = sessionDisplays.reduce((s: number, a: any) => s + (a.average_heartrate || 0) * (a.duration_seconds || 0), 0);
      const totalDur = sessionDisplays.reduce((s: number, a: any) => s + (a.duration_seconds || 0), 0);
      return totalDur > 0 ? weighted / totalDur : null;
    })(),
    average_speed: (() => {
      const totalDist = sessionDisplays.reduce((s: number, a: any) => s + (a.distance_meters || 0), 0);
      const totalDur = sessionDisplays.reduce((s: number, a: any) => s + (a.duration_seconds || 0), 0);
      return totalDur > 0 ? totalDist / totalDur : null;
    })(),
  } : null;

  const displayActivity = aggregated || primaryActivity;

  const delta = displayActivity
    ? timeDelta(workout.target_duration_seconds, displayActivity.duration_seconds)
    : null;

  // Headline title: Strava/.fit activity name when available, otherwise the plan title.
  const headline = displayActivity?.activity_name?.trim()
    || workout.title?.trim()
    || workout.workout_type
    || "Workout";

  // Plan summary line ("10km @ 5:00/km")
  const planLine = planSummary(workout);

  // Actual numbers
  const actualDistanceKm = displayActivity?.distance_meters ? displayActivity.distance_meters / 1000 : null;
  const actualPaceSecPerKm = displayActivity?.average_speed ? 1000 / displayActivity.average_speed : null;
  const actualHr = displayActivity?.average_heartrate ? Math.round(displayActivity.average_heartrate) : null;
  const actualDurationSec = displayActivity?.duration_seconds ?? null;

  // Deltas (pace + distance only — per design choice)
  const dDelta = distanceDelta(workout.target_distance_meters, displayActivity?.distance_meters);
  const pDelta = paceDelta(workout.target_pace_per_km, actualPaceSecPerKm);

  // Overall fidelity tone: bad wins over warn wins over good.
  const fidelityTone: Tone | null = (() => {
    const tones = [dDelta?.tone, pDelta?.tone].filter(Boolean) as Tone[];
    if (tones.length === 0) return null;
    if (tones.includes("bad")) return "bad";
    if (tones.includes("warn")) return "warn";
    return "good";
  })();

  const sources = [...new Set(activities.map((a: any) => a.source))] as string[];

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card transition-all duration-200",
        isRest && "border-border/40 bg-muted/20 opacity-70",
        !isRest && status === "done" && "border-border hover:border-emerald-500/40",
        !isRest && status === "missed" && "border-border hover:border-red-500/40",
        !isRest && status === "upcoming" && "border-border",
        workout.isDerivedSession && "bg-accent/30",
      )}
    >
    {/* Rest / cross-training: same card, muted */}
    {isRest ? (
      <div className="flex items-center gap-3 px-4 py-3 text-muted-foreground/70">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        <span className="text-sm font-medium">{workout.title || "Rest"}</span>
        <span className="text-xs uppercase tracking-wider text-muted-foreground/50">
          {workout.workout_type}
        </span>
      </div>
    ) : (
    <>
      {/* Left accent rail — tone-coloured */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-[3px]",
          status === "done" && fidelityTone ? toneDotClass[fidelityTone] : "",
          status === "done" && !fidelityTone && "bg-emerald-500/60",
          status === "missed" && "bg-red-500/60",
          status === "upcoming" && "bg-muted-foreground/15",
        )}
      />

      {/* Header row: title + plan badge + actions */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 pt-3 pb-2.5 hover:bg-accent/20 transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* Status dot */}
          <div className={cn(
            "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
            status === "done" && "bg-emerald-500/15",
            status === "missed" && "bg-red-500/15",
            status === "upcoming" && "bg-muted/60",
          )}>
            {status === "done" ? (
              <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
            ) : status === "missed" ? (
              <X className="h-3 w-3 text-red-500 dark:text-red-400" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            )}
          </div>

          {/* Title + plan badge stack */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className={cn(
                "text-[15px] font-semibold leading-tight truncate",
                status === "missed" ? "text-muted-foreground" : "text-foreground",
              )}>
                {headline}
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
                {workout.workout_type}
              </span>
            </div>
            {planLine && (
              <p className="mt-0.5 text-xs text-muted-foreground/80">
                <span className="font-bold uppercase tracking-wider text-muted-foreground/50 mr-1.5">Plan</span>
                <span className="tabular-nums">{planLine}</span>
              </p>
            )}
          </div>

          {/* Source pills + actions + chevron */}
          <div className="flex items-center gap-1.5 shrink-0">
            {sources.map((source) => (
              <Badge
                key={source}
                variant="outline"
                className={cn(
                  "rounded-md text-[10px] px-1.5 py-0 h-5 font-medium gap-0.5",
                  source === "fit_upload"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "border-primary/30 bg-primary/10 text-primary",
                )}
              >
                {source === "fit_upload" ? (
                  <><File className="h-2.5 w-2.5" />.FIT</>
                ) : (
                  <><Activity className="h-2.5 w-2.5" />Strava</>
                )}
              </Badge>
            ))}
            {sourceImportId && onViewSource && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onViewSource(sourceImportId); }}
                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-1.5 py-0 h-5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                title="View original coach plan"
              >
                <FileText className="h-2.5 w-2.5" />
                Source
              </button>
            )}
            {!isReadOnly && !workout.isDerivedSession && (
              <div className="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <Button variant="ghost" size="icon"
                    className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="icon"
                    className="h-6 w-6 rounded-md text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground/50 transition-transform duration-200",
              expanded && "rotate-180",
            )} />
          </div>
        </div>

        {/* Performance metrics row */}
        {(displayActivity || workout.target_distance_meters || workout.target_duration_seconds) && (
          <div className="mt-3 pl-8 grid grid-cols-[1fr_1fr_auto] sm:grid-cols-[1fr_1fr_auto_auto] gap-x-4 gap-y-1 items-end">
            {/* Distance */}
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50">Distance</p>
              <p className="text-base font-semibold tabular-nums leading-none">
                {actualDistanceKm != null
                  ? `${actualDistanceKm.toFixed(2)} km`
                  : workout.target_distance_meters
                    ? <span className="text-muted-foreground/60">{formatDistance(workout.target_distance_meters)}</span>
                    : <span className="text-muted-foreground/40">—</span>}
              </p>
              {dDelta && (
                <p className={cn("text-[11px] font-semibold tabular-nums", toneTextClass[dDelta.tone])}>
                  {dDelta.text}
                </p>
              )}
            </div>

            {/* Pace */}
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50">Pace</p>
              <p className="text-base font-semibold tabular-nums leading-none">
                {actualPaceSecPerKm != null
                  ? formatPace(actualPaceSecPerKm)
                  : workout.target_pace_per_km
                    ? <span className="text-muted-foreground/60">{formatPace(workout.target_pace_per_km)}</span>
                    : <span className="text-muted-foreground/40">—</span>}
              </p>
              {pDelta && (
                <p className={cn("text-[11px] font-semibold tabular-nums", toneTextClass[pDelta.tone])}>
                  {pDelta.text}
                </p>
              )}
            </div>

            {/* Secondary: duration + HR (no delta) */}
            <div className="hidden sm:block space-y-0.5 text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50">Time</p>
              <p className="text-sm font-medium tabular-nums leading-none text-muted-foreground">
                {actualDurationSec != null
                  ? formatDuration(actualDurationSec)
                  : workout.target_duration_seconds
                    ? formatDuration(workout.target_duration_seconds)
                    : "—"}
              </p>
            </div>

            <div className="space-y-0.5 text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50">HR</p>
              <p className="text-sm font-medium tabular-nums leading-none text-muted-foreground">
                {actualHr != null ? <><Heart className="inline h-3 w-3 mr-0.5 -mt-0.5" />{actualHr}</> : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Goal tags (compact) */}
        {goalNames.length > 0 && (
          <div className="mt-2 pl-8 flex items-center gap-1.5 flex-wrap">
            <Target className="h-3 w-3 text-muted-foreground/40" />
            {goalNames.map((name) => (
              <span key={name} className="text-[10px] text-muted-foreground/70">{name}</span>
            ))}
          </div>
        )}

        {/* Reflection preview when collapsed */}
        {!expanded && primaryActivity?.reflection && (
          <div className="mt-2 pl-8">
            <ActivityReflection
              activityId={primaryActivity.id}
              reflection={primaryActivity.reflection}
              variant="preview"
            />
          </div>
        )}

        {/* Mobile actions */}
        {!isReadOnly && !workout.isDerivedSession && (onEdit || onDelete) && (
          <div className="flex sm:hidden items-center gap-1 mt-2 justify-end">
            {onEdit && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </Button>
            )}
          </div>
        )}
      </button>

          {/* Multi-session expanded view */}
          {isMultiSession ? (
            <div className="px-4 pb-4 pt-1 space-y-4">
              {/* Plan + description */}
              <ExpandedDetail workout={workout} activity={null} laps={[]} />
              {sessions.map((session: MergedSession, idx: number) => (
                <SessionSection
                  key={session.displayActivity.id}
                  session={session}
                  sessionIndex={idx}
                  totalSessions={sessions.length}
                  onDeleteActivity={onDeleteActivity}
                  confirmDeleteId={confirmDeleteActivity}
                  setConfirmDeleteId={setConfirmDeleteActivity}
                  isDeletingActivity={isDeletingActivity}
                />
              ))}
            </div>
          ) : (
            <>
              <SingleSessionExpanded
                workout={workout}
                session={sessions[0] || null}
                onDeleteActivity={onDeleteActivity}
                confirmDeleteId={confirmDeleteActivity}
                setConfirmDeleteId={setConfirmDeleteActivity}
                isDeletingActivity={isDeletingActivity}
              />
            </>
          )}
        </div>
      )}
    </>
    )}
    </article>
  );
});

import { Pencil, Trash2, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function WorkoutStatusBadge({ workout, matchedActivity }: { workout: TrainingPlanDisplayWorkout; matchedActivity: any }) {
  const status = getWorkoutStatus(workout, matchedActivity);

  if (status === "done") {
    return (
      <Badge variant="outline" className="border-success/30 bg-success/10 text-foreground">
        Done
      </Badge>
    );
  }

  if (status === "missed") {
    return <Badge variant="destructive">Missed</Badge>;
  }

  return <Badge variant="secondary">Upcoming</Badge>;
}

export function TrainingWorkoutCard({
  workout,
  matchedActivity,
  isReadOnly = false,
  goalNames = [],
  onEdit,
  onDelete,
}: TrainingWorkoutCardProps) {
  const plannedMetrics = [
    workout.target_distance_meters ? `Distance ${formatDistance(workout.target_distance_meters)}` : null,
    workout.target_duration_seconds ? `Duration ${formatDuration(workout.target_duration_seconds)}` : null,
    workout.target_pace_per_km ? `Pace ${formatPace(workout.target_pace_per_km)}` : null,
  ].filter(Boolean) as string[];

  const actualMetrics = matchedActivity
    ? [
        matchedActivity.distance_meters ? formatDistance(matchedActivity.distance_meters) : null,
        matchedActivity.duration_seconds ? formatDuration(matchedActivity.duration_seconds) : null,
        matchedActivity.average_heartrate ? `${Math.round(matchedActivity.average_heartrate)} bpm` : null,
        matchedActivity.total_elevation_gain ? `+${Math.round(matchedActivity.total_elevation_gain)} m` : null,
      ].filter(Boolean)
    : [];

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card/80 p-4 shadow-sm transition-colors",
        matchedActivity && "border-success/25 bg-success/10",
        workout.isDerivedSession && "border-accent-foreground/10 bg-accent/40"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-foreground">{workout.title || workout.workout_type}</h4>
            <Badge variant="outline" className="bg-background/80">
              {workout.workout_type}
            </Badge>
            {workout.sessionLabel && (
              <Badge variant="outline" className="border-primary/20 bg-accent text-accent-foreground">
                {workout.sessionLabel}
              </Badge>
            )}
            <WorkoutStatusBadge workout={workout} matchedActivity={matchedActivity} />
          </div>

          {/* Goal tags */}
          {goalNames.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {goalNames.map(name => (
                <Badge key={name} variant="secondary" className="text-xs font-normal">
                  {name}
                </Badge>
              ))}
            </div>
          )}

          {workout.description && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {workout.description}
            </p>
          )}

          {(plannedMetrics.length > 0 || actualMetrics.length > 0 || workout.notes) && (
            <div className="grid gap-3 lg:grid-cols-2">
              {plannedMetrics.length > 0 && (
                <section className="rounded-xl border border-border bg-background/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Planned
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {plannedMetrics.map((metric) => (
                      <span key={metric} className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground">
                        {metric}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {matchedActivity && actualMetrics.length > 0 && (
                <section className="rounded-xl border border-success/25 bg-success/10 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Actual
                  </p>
                  {matchedActivity.activity_name && (
                    <p className="mt-2 text-sm font-medium text-foreground">{matchedActivity.activity_name}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {actualMetrics.map((metric) => (
                      <span key={metric} className="rounded-full border border-success/20 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground">
                        {metric}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {workout.notes && (
                <section className="rounded-xl border border-border bg-background/70 p-3 lg:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Notes
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{workout.notes}</p>
                </section>
              )}
            </div>
          )}
        </div>

        {!isReadOnly && !workout.isDerivedSession && (onEdit || onDelete) && (
          <div className="flex shrink-0 gap-1">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-9 w-9 min-h-0 min-w-0" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-9 w-9 min-h-0 min-w-0 text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

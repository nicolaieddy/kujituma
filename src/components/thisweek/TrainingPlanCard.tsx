import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Copy, Trash2, Pencil } from "lucide-react";
import { useTrainingPlan, type TrainingPlanWorkout } from "@/hooks/useTrainingPlan";
import { TrainingWorkoutEditor } from "@/components/thisweek/TrainingWorkoutEditor";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface TrainingPlanCardProps {
  weekStart: string;
  isReadOnly?: boolean;
  goalId?: string | null;
}

function formatDistance(meters: number | null): string {
  if (!meters) return "";
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${Math.round(meters)}m`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatPace(secPerKm: number | null): string {
  if (!secPerKm) return "";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

function WorkoutStatusBadge({ workout, matchedActivity }: { workout: TrainingPlanWorkout; matchedActivity: any }) {
  if (matchedActivity) {
    return <Badge variant="default" className="bg-green-600 text-white text-xs">✓ Done</Badge>;
  }
  // Check if the day has passed
  const today = new Date();
  const [y, mo, d] = workout.week_start.split('-').map(Number);
  const workoutDate = new Date(y, mo - 1, d + workout.day_of_week);
  if (workoutDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    return <Badge variant="destructive" className="text-xs">Missed</Badge>;
  }
  return <Badge variant="secondary" className="text-xs">Upcoming</Badge>;
}

export function TrainingPlanCard({ weekStart, isReadOnly = false, goalId }: TrainingPlanCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<TrainingPlanWorkout | null>(null);

  const {
    workouts,
    isLoading,
    getMatchedActivity,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    copyFromPreviousWeek,
    isCreating,
    isCopying,
  } = useTrainingPlan(weekStart);

  if (isLoading) return null;

  // Group workouts by day
  const byDay = DAY_LABELS.map((label, idx) => ({
    label,
    dayIndex: idx,
    workouts: workouts.filter(w => w.day_of_week === idx),
  })).filter(d => d.workouts.length > 0 || isEditing);

  const completedCount = workouts.filter(w => getMatchedActivity(w.matched_strava_activity_id)).length;
  const totalCount = workouts.length;

  // Don't show card if no workouts and read-only
  if (totalCount === 0 && isReadOnly) return null;

  return (
    <Card className="border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <CardTitle className="text-foreground text-base">
                Training Plan
                {totalCount > 0 && (
                  <span className="text-muted-foreground font-normal text-sm ml-2">
                    {completedCount}/{totalCount} completed
                  </span>
                )}
              </CardTitle>
            </CollapsibleTrigger>
            {!isReadOnly && (
              <div className="flex gap-1">
                {totalCount === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyFromPreviousWeek()}
                    disabled={isCopying}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy last week
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(!isEditing);
                    setEditingWorkout(null);
                  }}
                >
                  {isEditing ? "Done" : <><Pencil className="h-3.5 w-3.5 mr-1" />Edit</>}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {totalCount === 0 && !isEditing && (
              <p className="text-sm text-muted-foreground py-2">
                No training plan for this week.{" "}
                {!isReadOnly && (
                  <button
                    className="text-primary hover:underline"
                    onClick={() => setIsEditing(true)}
                  >
                    Add workouts
                  </button>
                )}
              </p>
            )}

            {byDay.map(({ label, dayIndex, workouts: dayWorkouts }) => (
              <div key={dayIndex} className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
                {dayWorkouts.map((workout) => {
                  const matched = getMatchedActivity(workout.matched_strava_activity_id);
                  return (
                    <div
                      key={workout.id}
                      className={cn(
                        "rounded-lg border p-3 text-sm",
                        matched ? "border-green-500/30 bg-green-500/5" : "border-border"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{workout.title || workout.workout_type}</span>
                            <WorkoutStatusBadge workout={workout} matchedActivity={matched} />
                          </div>
                          {workout.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{workout.description}</p>
                          )}
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            {workout.target_distance_meters && <span>Target: {formatDistance(workout.target_distance_meters)}</span>}
                            {workout.target_duration_seconds && <span>{formatDuration(workout.target_duration_seconds)}</span>}
                            {workout.target_pace_per_km && <span>{formatPace(workout.target_pace_per_km)}</span>}
                          </div>
                          {matched && (
                            <div className="flex gap-3 mt-1 text-xs text-green-600 dark:text-green-400">
                              <span>Actual: {formatDistance(matched.distance_meters)}</span>
                              {matched.duration_seconds && <span>{formatDuration(matched.duration_seconds)}</span>}
                              {matched.average_heartrate && <span>{Math.round(matched.average_heartrate)} bpm</span>}
                              {matched.total_elevation_gain && <span>↑{Math.round(matched.total_elevation_gain)}m</span>}
                            </div>
                          )}
                        </div>
                        {isEditing && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setEditingWorkout(workout)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => deleteWorkout(workout.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {isEditing && (
              <TrainingWorkoutEditor
                weekStart={weekStart}
                goalId={goalId || null}
                editingWorkout={editingWorkout}
                onSave={async (data) => {
                  if (editingWorkout) {
                    await updateWorkout({ id: editingWorkout.id, ...data });
                  } else {
                    await createWorkout({ ...data, week_start: weekStart, goal_id: goalId || null });
                  }
                  setEditingWorkout(null);
                }}
                onCancel={() => setEditingWorkout(null)}
                isSaving={isCreating}
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

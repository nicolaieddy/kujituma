import { useMemo } from "react";
import { Dumbbell, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTrainingWorkoutsForGoal, type TrainingPlanWorkout } from "@/hooks/useTrainingPlan";
import { DAY_LABELS, formatDistance, formatDuration } from "@/components/thisweek/trainingPlanUtils";
import { useNavigate } from "react-router-dom";

interface GoalDetailTrainingSectionProps {
  goalId: string;
}

export function GoalDetailTrainingSection({ goalId }: GoalDetailTrainingSectionProps) {
  const { data: workouts = [], isLoading } = useTrainingWorkoutsForGoal(goalId);
  const navigate = useNavigate();

  // Group by week
  const byWeek = useMemo(() => {
    const map = new Map<string, TrainingPlanWorkout[]>();
    for (const w of workouts) {
      const existing = map.get(w.week_start) || [];
      existing.push(w);
      map.set(w.week_start, existing);
    }
    return Array.from(map.entries()).slice(0, 4); // Show last 4 weeks
  }, [workouts]);

  if (isLoading) return null;
  if (workouts.length === 0) return null;

  const formatWeekLabel = (weekStart: string) => {
    const date = new Date(weekStart + "T00:00:00");
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" />
          Training Plan
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7"
          onClick={() => navigate("/")}
        >
          View this week
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </div>

      <div className="space-y-4">
        {byWeek.map(([weekStart, weekWorkouts]) => (
          <div key={weekStart} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Week of {formatWeekLabel(weekStart)}
            </p>
            <div className="space-y-1.5">
              {weekWorkouts
                .sort((a, b) => a.day_of_week - b.day_of_week || a.order_index - b.order_index)
                .map(w => (
                  <div
                    key={w.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-sm"
                  >
                    <span className="text-xs font-medium text-muted-foreground w-8 shrink-0">
                      {DAY_LABELS[w.day_of_week]?.slice(0, 3)}
                    </span>
                    <span className="font-medium text-foreground truncate flex-1">
                      {w.title || w.workout_type}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {w.workout_type}
                    </Badge>
                    {w.target_distance_meters && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistance(w.target_distance_meters)}
                      </span>
                    )}
                    {w.target_duration_seconds && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDuration(w.target_duration_seconds)}
                      </span>
                    )}
                    {(w.matched_strava_activity_id || w.matched_activity_id) && (
                      <Badge variant="outline" className="border-success/30 bg-success/10 text-xs shrink-0">
                        ✓
                      </Badge>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

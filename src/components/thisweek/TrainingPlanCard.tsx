import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, Copy, Plus, Upload, Link2 } from "lucide-react";
import { useTrainingPlan, type TrainingPlanWorkout, type CreateTrainingWorkoutData } from "@/hooks/useTrainingPlan";
import { useGoals } from "@/hooks/useGoals";
import { TrainingWorkoutDialog } from "@/components/thisweek/TrainingWorkoutDialog";
import { TrainingWorkoutCard } from "@/components/thisweek/TrainingWorkoutCard";
import { DAY_LABELS, getDisplayWorkouts } from "@/components/thisweek/trainingPlanUtils";
import { parseLocalDate } from "@/utils/dateUtils";
import { format, addDays } from "date-fns";
import { BulkFitUploadDialog } from "@/components/training/BulkFitUploadDialog";

interface TrainingPlanCardProps {
  weekStart: string;
  isReadOnly?: boolean;
  goalId?: string | null;
}

export function TrainingPlanCard({ weekStart, isReadOnly = false, goalId }: TrainingPlanCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<TrainingPlanWorkout | null>(null);
  const [bulkLinkOpen, setBulkLinkOpen] = useState(false);
  const [bulkSelectedGoals, setBulkSelectedGoals] = useState<string[]>([]);

  const {
    workouts,
    isLoading,
    getMatchedActivity,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    deleteActivity,
    copyFromPreviousWeek,
    isSaving,
    isCopying,
    isDeletingActivity,
  } = useTrainingPlan(weekStart);

  const { goals } = useGoals();
  const activeGoals = goals.filter(g => g.status === "in_progress" || g.status === "not_started");

  const displayWorkouts = useMemo(() => getDisplayWorkouts(workouts), [workouts]);

  const byDay = useMemo(
    () =>
      DAY_LABELS.map((label, idx) => ({
        label,
        dayIndex: idx,
        workouts: displayWorkouts.filter((workout) => workout.day_of_week === idx),
      })).filter((day) => day.workouts.length > 0),
    [displayWorkouts]
  );

  // Compute linked goals across all workouts
  const linkedGoalIds = useMemo(() => {
    const ids = new Set<string>();
    workouts.forEach(w => {
      const gids = w.goal_ids || (w.goal_id ? [w.goal_id] : []);
      gids.forEach(id => ids.add(id));
    });
    return Array.from(ids);
  }, [workouts]);

  // Compute dominant goal IDs (most frequently used) for default selection
  const dominantGoalIds = useMemo(() => {
    const freq = new Map<string, number>();
    workouts.forEach(w => {
      const gids = w.goal_ids || (w.goal_id ? [w.goal_id] : []);
      gids.forEach(id => freq.set(id, (freq.get(id) || 0) + 1));
    });
    if (freq.size === 0) return goalId ? [goalId] : [];
    const maxCount = Math.max(...freq.values());
    return Array.from(freq.entries())
      .filter(([, count]) => count === maxCount)
      .map(([id]) => id);
  }, [workouts, goalId]);

  const linkedGoalNames = useMemo(
    () => linkedGoalIds.map(id => goals.find(g => g.id === id)).filter(Boolean),
    [linkedGoalIds, goals]
  );

  const completedCount = displayWorkouts.filter((workout) => {
    const source = workouts.find(w => w.id === workout.sourceWorkoutId) || workout;
    return getMatchedActivity(source as any);
  }).length;
  const totalCount = displayWorkouts.length;

  if (isLoading) return null;
  if (totalCount === 0 && isReadOnly) return null;

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingWorkout(null);
  };

  const openCreateDialog = () => {
    setEditingWorkout(null);
    setDialogOpen(true);
  };

  const openEditDialog = (workout: TrainingPlanWorkout) => {
    setEditingWorkout(workout);
    setDialogOpen(true);
  };

  const handleSave = async (data: Omit<CreateTrainingWorkoutData, "week_start"> & { goal_ids?: string[] }) => {
    const { goal_ids, ...rest } = data;
    if (editingWorkout) {
      await updateWorkout({ id: editingWorkout.id, ...rest, goal_ids });
    } else {
      await createWorkout({ ...rest, week_start: weekStart, goal_id: goalId || null, goal_ids });
    }
    setEditingWorkout(null);
  };

  const handleBulkLink = async () => {
    for (const w of workouts) {
      await updateWorkout({ id: w.id, goal_ids: bulkSelectedGoals });
    }
    setBulkLinkOpen(false);
  };

  const toggleBulkGoal = (goalId: string) => {
    setBulkSelectedGoals(prev =>
      prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]
    );
  };

  // Helper to get goal names for a workout
  const getGoalNames = (workout: TrainingPlanWorkout) => {
    const ids = workout.goal_ids || (workout.goal_id ? [workout.goal_id] : []);
    return ids.map(id => goals.find(g => g.id === id)?.title).filter(Boolean) as string[];
  };

  return (
    <>
      <Card className="border-border">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <CollapsibleTrigger className="flex items-start gap-3 text-left hover:opacity-80">
                <span className="mt-1">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">Training Plan</CardTitle>
                    {totalCount > 0 && (
                      <Badge variant="outline" className="bg-background/80">
                        {completedCount}/{totalCount} completed
                      </Badge>
                    )}
                  </div>
                  {linkedGoalNames.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {linkedGoalNames.map(goal => (
                        <Badge key={goal!.id} variant="secondary" className="text-xs font-normal">
                          {goal!.title}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {linkedGoalNames.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No goals linked yet
                    </p>
                  )}
                </div>
              </CollapsibleTrigger>

              {!isReadOnly && (
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {activeGoals.length > 0 && totalCount > 0 && (
                    <Popover open={bulkLinkOpen} onOpenChange={(open) => {
                      setBulkLinkOpen(open);
                      if (open) setBulkSelectedGoals(linkedGoalIds);
                    }}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Link2 className="h-4 w-4" />
                          Link to goal
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" align="end">
                        <div className="space-y-3">
                          <p className="text-sm font-medium">Link all workouts to goals</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {activeGoals.map(goal => (
                              <label key={goal.id} className="flex items-center gap-2 cursor-pointer text-sm">
                                <Checkbox
                                  checked={bulkSelectedGoals.includes(goal.id)}
                                  onCheckedChange={() => toggleBulkGoal(goal.id)}
                                />
                                <span className="truncate text-foreground">{goal.title}</span>
                              </label>
                            ))}
                          </div>
                          <Button size="sm" className="w-full" onClick={handleBulkLink}>
                            Apply to all workouts
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setBulkUploadOpen(true)}>
                    <Upload className="h-4 w-4" />
                    Upload .fit
                  </Button>
                  {totalCount === 0 && (
                    <Button variant="outline" size="sm" onClick={() => copyFromPreviousWeek()} loading={isCopying}>
                      <Copy className="h-4 w-4" />
                      Copy last week
                    </Button>
                  )}
                  <Button size="sm" onClick={openCreateDialog}>
                    <Plus className="h-4 w-4" />
                    Add workout
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="space-y-5 pt-0">
              {totalCount === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">No training plan for this week yet.</p>
                  {!isReadOnly && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Button variant="outline" onClick={() => copyFromPreviousWeek()} loading={isCopying}>
                        <Copy className="h-4 w-4" />
                        Copy last week
                      </Button>
                      <Button onClick={openCreateDialog}>
                        <Plus className="h-4 w-4" />
                        Add first workout
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                byDay.map(({ label, dayIndex, workouts: dayWorkouts }) => (
                  <section key={dayIndex} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        {label} – {format(addDays(parseLocalDate(weekStart), dayIndex), "d MMM")}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {dayWorkouts.length} session{dayWorkouts.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {dayWorkouts.map((workout) => {
                        const sourceWorkout = workouts.find((item) => item.id === workout.sourceWorkoutId) || null;
                        const matched = workout.isDerivedSession ? null : getMatchedActivity(sourceWorkout || workout as any);
                        const goalNames = sourceWorkout ? getGoalNames(sourceWorkout) : [];

                        return (
                          <TrainingWorkoutCard
                            key={workout.id}
                            workout={workout}
                            matchedActivity={matched}
                            isReadOnly={isReadOnly}
                            goalNames={goalNames}
                            onEdit={sourceWorkout ? () => openEditDialog(sourceWorkout) : undefined}
                            onDelete={sourceWorkout ? () => deleteWorkout(sourceWorkout.id) : undefined}
                            onDeleteActivity={matched?.source === "fit_upload" ? (id) => deleteActivity(id) : undefined}
                            isDeletingActivity={isDeletingActivity}
                          />
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {!isReadOnly && (
        <>
          <TrainingWorkoutDialog
            open={dialogOpen}
            onOpenChange={handleDialogChange}
            editingWorkout={editingWorkout}
            onSave={handleSave}
            isSaving={isSaving}
            defaultGoalIds={dominantGoalIds}
          />
          <BulkFitUploadDialog
            open={bulkUploadOpen}
            onOpenChange={setBulkUploadOpen}
          />
        </>
      )}
    </>
  );
}

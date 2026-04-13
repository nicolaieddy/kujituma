import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Target, Activity, Calendar, FileText, Smile, Zap } from "lucide-react";
import { useHistoricalWeekData } from "@/hooks/useHistoricalWeekData";
import { format, parseISO, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { countMovedObjectives } from "@/utils/movedObjectivesUtils";

interface HistoricalWeekSummaryProps {
  weekStart: string;
  objectives: Array<{ id: string; is_completed: boolean; text: string }>;
  reflectionNotes: string;
  incompleteReflections: Record<string, string>;
  weekIntention?: string | null;
}

const moodEmoji = (rating: number | null) => {
  if (rating == null) return "—";
  if (rating >= 4) return "😊";
  if (rating >= 3) return "😐";
  return "😔";
};

const energyEmoji = (rating: number | null) => {
  if (rating == null) return "—";
  if (rating >= 4) return "⚡";
  if (rating >= 3) return "🔋";
  return "🪫";
};

const completionColor = (rate: number) => {
  if (rate >= 75) return "text-green-600 dark:text-green-400";
  if (rate >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

const progressColor = (rate: number) => {
  if (rate >= 75) return "[&>div]:bg-green-500";
  if (rate >= 40) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-500";
};

export const HistoricalWeekSummary = ({
  weekStart,
  objectives,
  reflectionNotes,
  incompleteReflections,
  weekIntention,
}: HistoricalWeekSummaryProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showFullReflection, setShowFullReflection] = useState(false);
  const [showWinsBlockers, setShowWinsBlockers] = useState(false);

  const {
    checkIns,
    checkInCount,
    avgMood,
    avgEnergy,
    habitCompletions,
    habitCompletionsByDay,
    totalHabitSlots,
    isLoading,
  } = useHistoricalWeekData(weekStart);

  // Objectives metrics — include moved objectives in the denominator
  const movedCount = countMovedObjectives(incompleteReflections);
  const totalObjectives = objectives.length + movedCount;
  const completedObjectives = objectives.filter((o) => o.is_completed).length;
  const objectiveRate = totalObjectives > 0 ? Math.round((completedObjectives / totalObjectives) * 100) : 0;

  // Habit rate
  const habitRate = totalHabitSlots > 0 ? Math.min(Math.round((habitCompletions / totalHabitSlots) * 100), 100) : 0;

  // Check if there's any data worth showing
  const hasObjectives = totalObjectives > 0;
  const hasHabits = habitCompletions > 0 || habitCompletionsByDay.some((d) => d.count > 0);
  const hasCheckIns = checkInCount > 0;
  const hasReflection = (reflectionNotes && reflectionNotes.trim().length > 0) || Object.keys(incompleteReflections || {}).length > 0;
  const hasAnyData = hasObjectives || hasHabits || hasCheckIns || hasReflection;

  if (!hasAnyData && !isLoading) return null;

  // Quick wins and blockers from check-ins
  const quickWins = checkIns.filter((c) => c.quick_win).map((c) => ({ date: c.date, text: c.quick_win! }));
  const blockers = checkIns.filter((c) => c.blocker).map((c) => ({ date: c.date, text: c.blocker! }));

  // Incomplete reflections as entries
  const reflectionEntries = Object.entries(incompleteReflections || {}).filter(([, v]) => v && v.trim());

  // Day labels for habit dots
  const dayLabels = Array.from({ length: 7 }, (_, i) =>
    format(addDays(parseISO(weekStart), i), "EEE")
  );

  // Max completions in a day for scaling dots
  const maxDayCompletions = Math.max(...habitCompletionsByDay.map((d) => d.count), 1);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-primary/20 bg-primary/5">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Week in Review</h3>
              {hasObjectives && (
                <Badge variant="secondary" className="text-xs">
                  {completedObjectives}/{totalObjectives} objectives
                </Badge>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 rounded-lg bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Objectives Performance */}
                {hasObjectives && (
                  <div className="rounded-lg border border-border/50 bg-background/60 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Target className="h-4 w-4" />
                      Objectives
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-2xl font-bold", completionColor(objectiveRate))}>
                        {objectiveRate}%
                      </span>
                     <span className="text-xs text-muted-foreground">
                        {completedObjectives}/{totalObjectives} completed
                        {movedCount > 0 && ` (${movedCount} rescheduled)`}
                      </span>
                    </div>
                    <Progress value={objectiveRate} className={cn("h-1.5", progressColor(objectiveRate))} />
                  </div>
                )}

                {/* Habit Completions */}
                {hasHabits && (
                  <div className="rounded-lg border border-border/50 bg-background/60 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Activity className="h-4 w-4" />
                      Habits
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-foreground">
                        {habitCompletions}
                      </span>
                      <span className="text-xs text-muted-foreground">completions this week</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {habitCompletionsByDay.map((day, i) => (
                        <div key={day.date} className="flex flex-col items-center gap-0.5 flex-1">
                          <div
                            className={cn(
                              "w-3 h-3 sm:w-4 sm:h-4 rounded-full",
                              day.count === 0
                                ? "bg-muted"
                                : day.count >= maxDayCompletions * 0.7
                                  ? "bg-green-500"
                                  : day.count >= maxDayCompletions * 0.3
                                    ? "bg-amber-400"
                                    : "bg-amber-200 dark:bg-amber-700"
                            )}
                            title={`${dayLabels[i]}: ${day.count} completions`}
                          />
                          <span className="text-[9px] text-muted-foreground leading-none">
                            {dayLabels[i].charAt(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Daily Check-ins */}
                {hasCheckIns && (
                  <div className="rounded-lg border border-border/50 bg-background/60 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Daily Check-ins
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-foreground">
                        {checkInCount}/7
                      </span>
                      <span className="text-xs text-muted-foreground">days</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {avgMood != null && (
                        <span className="flex items-center gap-1" title="Average mood">
                          <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                          {moodEmoji(avgMood)} {avgMood}
                        </span>
                      )}
                      {avgEnergy != null && (
                        <span className="flex items-center gap-1" title="Average energy">
                          <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                          {energyEmoji(avgEnergy)} {avgEnergy}
                        </span>
                      )}
                    </div>
                    {(quickWins.length > 0 || blockers.length > 0) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowWinsBlockers(!showWinsBlockers);
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        {showWinsBlockers ? "Hide" : "Show"} wins & blockers
                      </button>
                    )}
                    {showWinsBlockers && (
                      <div className="space-y-1.5 text-xs">
                        {quickWins.map((w, i) => (
                          <div key={i} className="flex gap-1.5">
                            <span className="text-green-500 shrink-0">✓</span>
                            <span className="text-muted-foreground">{w.text}</span>
                          </div>
                        ))}
                        {blockers.map((b, i) => (
                          <div key={i} className="flex gap-1.5">
                            <span className="text-red-500 shrink-0">✗</span>
                            <span className="text-muted-foreground">{b.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Reflection */}
                {hasReflection && (
                  <div className="rounded-lg border border-border/50 bg-background/60 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Reflection
                    </div>
                    {weekIntention && (
                      <p className="text-xs text-muted-foreground italic">
                        Intention: "{weekIntention}"
                      </p>
                    )}
                    {reflectionNotes && reflectionNotes.trim() && (
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {showFullReflection || reflectionNotes.length <= 150
                          ? reflectionNotes
                          : `${reflectionNotes.slice(0, 150)}…`}
                        {reflectionNotes.length > 150 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowFullReflection(!showFullReflection);
                            }}
                            className="ml-1 text-xs text-primary hover:underline"
                          >
                            {showFullReflection ? "less" : "more"}
                          </button>
                        )}
                      </p>
                    )}
                    {reflectionEntries.length > 0 && (
                      <div className="space-y-1 mt-1">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                          Incomplete objective notes
                        </p>
                        {reflectionEntries.slice(0, showFullReflection ? undefined : 2).map(([id, text]) => (
                          <p key={id} className="text-xs text-muted-foreground pl-2 border-l-2 border-border">
                            {text}
                          </p>
                        ))}
                        {!showFullReflection && reflectionEntries.length > 2 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowFullReflection(true);
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            +{reflectionEntries.length - 2} more
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

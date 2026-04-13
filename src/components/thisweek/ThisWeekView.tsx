import { useCallback, useState, useMemo } from "react";
import { parseLocalDate } from "@/utils/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, History } from "lucide-react";
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { useGoals } from "@/hooks/useGoals";
import { useAuth } from "@/contexts/AuthContext";
import { WeeklyObjectivesList } from "@/components/goals/WeeklyObjectivesList";
import { WeekHeader } from "@/components/thisweek/WeekHeader";
import { WeeklyReflectionCard } from "@/components/thisweek/WeeklyReflectionCard";
import { ShareWeekCard } from "@/components/thisweek/ShareWeekCard";
import { ThisWeekSkeleton } from "@/components/thisweek/ThisWeekSkeleton";
import { HabitsDueThisWeek } from "@/components/thisweek/HabitsDueThisWeek";
import { TrainingPlanCard } from "@/components/thisweek/TrainingPlanCard";
import { CloseWeekDialog } from "@/components/thisweek/CloseWeekDialog";
import { WeekTransitionCard } from "@/components/thisweek/WeekTransitionCard";
import { PartnerCheckInsCard } from "@/components/thisweek/PartnerCheckInsCard";
import { useHabitStats } from "@/hooks/useHabitStats";
import { EndOfWeekReflection } from "@/components/habits/EndOfWeekReflection";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { useAllWeeklyObjectives } from "@/hooks/useAllWeeklyObjectives";
import { AISuggestionsCard } from "@/components/goals/AISuggestionsCard";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { HabitsService } from "@/services/habitsService";
import { CarryOverObjectivesModal } from "@/components/goals/CarryOverObjectivesModal";
import { CarryOverActivityLog } from "@/components/goals/CarryOverActivityLog";
import { useCarryOverObjectives } from "@/hooks/useCarryOverObjectives";
import { useWeekClose } from "@/hooks/useWeekClose";
import { toast } from "@/hooks/use-toast";
import { HistoricalWeekSummary } from "@/components/thisweek/HistoricalWeekSummary";
import { useWeeklyPlanning } from "@/hooks/useWeeklyPlanning";

import { useObjectiveHandlers } from "@/hooks/useObjectiveHandlers";
import { useIncompleteReflections } from "@/hooks/useIncompleteReflections";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { useWeekTransition } from "@/hooks/useWeekTransition";

interface ThisWeekViewProps {
  weekStart?: string;
  onNavigateWeek?: (direction: 'previous' | 'next') => void;
}

export const ThisWeekView = ({ weekStart, onNavigateWeek }: ThisWeekViewProps) => {
  const { user } = useAuth();
  const { goals, isCached: goalsCached } = useGoals();
  const { habitStats } = useHabitStats();
  const { lastSync, isOffline } = useOfflineStatus();
  
  const {
    objectives,
    progressPost,
    createObjective,
    updateObjective,
    deleteObjective,
    deleteAllObjectives,
    reorderObjectives,
    updateProgressNotes,
    weekRange,
    weekNumber,
    weekStart: currentWeekStart,
    isDeletingAll,
    isLoading: weeklyDataLoading,
    isCached: objectivesCached,
    isRefetching,
    lastSyncTime,
    refetchObjectives,
    pendingUpdateIds,
    recentlySavedIds,
  } = useWeeklyProgress(weekStart);

  // All objectives for AI suggestions
  const { objectives: allObjectives } = useAllWeeklyObjectives();
  
  // Week status
  const isCurrentWeek = WeeklyProgressService.isCurrentWeek(currentWeekStart);
  const isWeekCompleted = progressPost?.is_completed || false;
  const isReadOnly = isWeekCompleted;
  const isEndOfWeekTime = HabitsService.isEndOfWeek();

  // Planning session data for historical summary
  const { planningSession } = useWeeklyPlanning(currentWeekStart);

  // Week transition (combines close last week + planning + reflections)
  const {
    shouldShowTransition,
    canReopenTransition,
    lastWeekStart,
    lastWeekObjectives,
    lastWeekReflections,
    handleUpdateReflection: handleUpdateLastWeekReflection,
    handleCarryOver,
    handleSetIntention,
    handleCompleteTransition,
    handleReopenTransition,
    isCarryingOver: isTransitionCarryingOver,
  } = useWeekTransition(currentWeekStart);

  // Carry-over modal for bringing incomplete objectives from past weeks
  const [showCarryOverModal, setShowCarryOverModal] = useState(false);
  // Carry-over modal for when viewing a closed week (carry to NEXT week)
  const [showCarryOverFromClosedModal, setShowCarryOverFromClosedModal] = useState(false);
  
  // Build goals map for logging
  const goalsForLogging = useMemo(() => 
    (goals || []).map(g => ({ id: g.id, title: g.title })),
    [goals]
  );

  const {
    incompleteObjectives: carryOverIncompleteObjectives,
    carryOverObjectives,
    carryOverObjectivesAsync,
    isCarryingOver: isCarryOverModalCarrying,
    dismissObjective,
    dismissedObjectives,
    restoreObjective,
  } = useCarryOverObjectives(currentWeekStart, goalsForLogging);

  const hasIncompleteObjectivesFromPastWeeks = carryOverIncompleteObjectives.length > 0;

  // Calculate next week start for carrying over from closed week
  const getNextWeekStart = () => {
    return WeeklyProgressService.addDaysToWeekStart(currentWeekStart, 7);
  };

  const maybeNavigateToTargetWeek = useCallback(
    (objectivesWithWeeks: { objectiveId: string; targetWeek: string }[]) => {
      if (!onNavigateWeek) return;

      const targetWeeks = Array.from(new Set(objectivesWithWeeks.map(o => o.targetWeek)));
      if (targetWeeks.length !== 1) return;

      const targetWeek = targetWeeks[0];
      if (!targetWeek || targetWeek === currentWeekStart) return;

      const [fy, fm, fd] = currentWeekStart.split('-').map(Number);
      const [ty, tm, td] = targetWeek.split('-').map(Number);
      const from = new Date(fy, fm - 1, fd);
      const to = new Date(ty, tm - 1, td);

      const diffDays = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
      const diffWeeks = Math.round(diffDays / 7);
      if (diffWeeks === 0) return;

      const direction = diffWeeks > 0 ? 'next' : 'previous';
      for (let i = 0; i < Math.abs(diffWeeks); i++) {
        onNavigateWeek(direction);
      }
    },
    [currentWeekStart, onNavigateWeek]
  );

  // Incomplete reflections handling
  const { incompleteReflections, handleUpdateIncompleteReflection } = useIncompleteReflections(
    progressPost,
    currentWeekStart
  );

  // Week close functionality
  const {
    showCloseDialog,
    setShowCloseDialog,
    closeWeek,
    isClosingWeek,
    incompleteObjectives: closeIncompleteObjectives,
    completedObjectives: closeCompletedObjectives,
  } = useWeekClose({
    currentWeekStart,
    objectives: objectives || [],
    incompleteReflections,
    progressNotes: progressPost?.notes || '',
  });

  // AI Suggestions
  const { 
    aiEnabled, 
    suggestions, 
    isSuggestionsLoading, 
    handleRefreshSuggestions 
  } = useAISuggestions({
    isCurrentWeek,
    isWeekCompleted,
    weeklyDataLoading,
    goals,
    objectives,
    allObjectives,
    currentWeekStart,
  });

  // Objective handlers
  const {
    isCreating,
    handleUpdateObjectiveGoal,
    handleAddObjective,
    handleToggleObjective,
    handleUpdateObjectiveText,
    handleDeleteObjective,
    handleReorderObjectives,
    handleUpdateObjectiveSchedule,
    handleMoveObjectiveToWeek,
  } = useObjectiveHandlers({
    currentWeekStart,
    objectives,
    progressPost,
    createObjective,
    updateObjective,
    deleteObjective,
    reorderObjectives,
    incompleteReflections,
  });


  // Navigation
  const handleNavigateWeek = useCallback((direction: 'previous' | 'next') => {
    if (onNavigateWeek) {
      onNavigateWeek(direction);
    }
  }, [onNavigateWeek]);

  // Add suggestion handler
  const handleAddSuggestion = async (text: string) => {
    try {
      await createObjective({
        text,
        week_start: currentWeekStart,
        goal_id: null,
      });
    } catch (err) {
      console.error('[ThisWeekView] Failed to add suggestion:', err);
    }
  };

  // Computed values
  const completedCount = objectives?.filter(obj => obj.is_completed).length || 0;
  const totalCount = objectives?.length || 0;

  // Loading state
  if (weeklyDataLoading) {
    return <ThisWeekSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <WeekHeader
        weekNumber={weekNumber}
        weekRange={weekRange}
        currentWeekStart={currentWeekStart}
        completedCount={completedCount}
        totalCount={totalCount}
        onNavigateWeek={handleNavigateWeek}
        isCached={objectivesCached || goalsCached || isOffline}
        lastSync={lastSyncTime || lastSync}
        isRefetching={isRefetching}
        onRefresh={refetchObjectives}
      />

      {/* Historical Week Summary - shown when viewing past weeks */}
      {!isCurrentWeek && (
        <HistoricalWeekSummary
          weekStart={currentWeekStart}
          objectives={objectives || []}
          reflectionNotes={progressPost?.notes || ""}
          incompleteReflections={
            (progressPost?.incomplete_reflections as Record<string, string>) || {}
          }
          weekIntention={planningSession?.week_intention}
        />
      )}

      {/* Carry Over Banner - prominent call to action when there are incomplete objectives from past weeks */}
      {isCurrentWeek && !isReadOnly && hasIncompleteObjectivesFromPastWeeks && !shouldShowTransition && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {carryOverIncompleteObjectives.length} incomplete objective{carryOverIncompleteObjectives.length !== 1 ? 's' : ''} from past weeks
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Carry them over to continue working on them
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canReopenTransition && (
                  <Button onClick={handleReopenTransition} size="sm" variant="outline" className="gap-2">
                    <History className="h-4 w-4" />
                    Review Last Week
                  </Button>
                )}
                <Button onClick={() => setShowCarryOverModal(true)} size="sm">
                  Review & Carry Over
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Last Week button when no carry-over banner but transition can be reopened */}
      {isCurrentWeek && !shouldShowTransition && canReopenTransition && !hasIncompleteObjectivesFromPastWeeks && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted">
                  <History className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Review last week's progress</p>
                  <p className="text-sm text-muted-foreground">
                    Revisit your objectives, reflections, and carry-over decisions
                  </p>
                </div>
              </div>
              <Button onClick={handleReopenTransition} size="sm" variant="outline" className="gap-2">
                <History className="h-4 w-4" />
                Review Last Week
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Week Transition Card - shows at start of week when last week needs closing */}
      {isCurrentWeek && shouldShowTransition && (
        <WeekTransitionCard
          lastWeekObjectives={lastWeekObjectives}
          lastWeekStart={lastWeekStart}
          lastWeekReflections={lastWeekReflections}
          currentWeekStart={currentWeekStart}
          goals={goals || []}
          onUpdateReflection={handleUpdateLastWeekReflection}
          onCarryOver={handleCarryOver}
          onSetIntention={handleSetIntention}
          onComplete={handleCompleteTransition}
          isCarryingOver={isTransitionCarryingOver}
        />
      )}

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">This Week's Focus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <WeeklyObjectivesList
            objectives={objectives || []}
            goals={goals || []}
            isWeekCompleted={isReadOnly}
            isCreating={isCreating}
            onToggleObjective={handleToggleObjective}
            onUpdateObjectiveText={handleUpdateObjectiveText}
            onUpdateObjectiveGoal={handleUpdateObjectiveGoal}
            onDeleteObjective={handleDeleteObjective}
            onDeleteAllObjectives={deleteAllObjectives}
            onAddObjective={handleAddObjective}
            onOpenCarryOver={() => setShowCarryOverModal(true)}
            hasIncompleteObjectives={hasIncompleteObjectivesFromPastWeeks}
            isDeletingAll={isDeletingAll}
            onReorderObjectives={handleReorderObjectives}
            onUpdateObjectiveSchedule={handleUpdateObjectiveSchedule}
            currentWeekStart={currentWeekStart}
            onMoveObjectiveToWeek={handleMoveObjectiveToWeek}
            pendingUpdateIds={pendingUpdateIds}
            recentlySavedIds={recentlySavedIds}
          />
        </CardContent>
      </Card>

      {aiEnabled && isCurrentWeek && !isReadOnly && (suggestions.length > 0 || isSuggestionsLoading) && (
        <AISuggestionsCard
          suggestions={suggestions}
          isLoading={isSuggestionsLoading}
          onAddSuggestion={handleAddSuggestion}
          onRefresh={handleRefreshSuggestions}
        />
      )}

      {/* Show incomplete objectives reflection - only Friday 6pm through Sunday when there are incomplete objectives */}
      {isCurrentWeek && !isReadOnly && isEndOfWeekTime && objectives && objectives.some(obj => !obj.is_completed) && (
        <EndOfWeekReflection
          objectives={objectives}
          incompleteReflections={incompleteReflections}
          onUpdateReflection={handleUpdateIncompleteReflection}
          isReadOnly={isReadOnly}
        />
      )}

      <WeeklyReflectionCard
        initialNotes={progressPost?.notes || ""}
        onUpdateNotes={updateProgressNotes}
        isReadOnly={isReadOnly}
        weekStart={currentWeekStart}
      />

      {/* Partner Check-ins Card - shows accountability partner activity */}
      {isCurrentWeek && <PartnerCheckInsCard />}

      {/* Habits section - shown for all weeks with habit data */}
      {habitStats.length > 0 && (
        <HabitsDueThisWeek
          habits={habitStats}
          objectives={objectives || []}
          onToggleObjective={isCurrentWeek ? handleToggleObjective : undefined}
          weekStart={parseLocalDate(currentWeekStart)}
          isReadOnly={!isCurrentWeek}
        />
      )}

      {/* Training Plan */}
      <TrainingPlanCard
        weekStart={currentWeekStart}
        isReadOnly={!isCurrentWeek}
      />

      {/* Carry-Over Activity Log */}
      <CarryOverActivityLog />

      <ShareWeekCard
        isCurrentWeek={isCurrentWeek}
        objectives={objectives || []}
        reflectionValue={progressPost?.notes || ""}
        onCloseWeek={() => setShowCloseDialog(true)}
        onCarryOverIncomplete={isWeekCompleted && closeIncompleteObjectives.length > 0 
          ? () => setShowCarryOverFromClosedModal(true) 
          : undefined
        }
        incompleteCount={closeIncompleteObjectives.length}
        isWeekCompleted={isWeekCompleted}
        isClosingWeek={isClosingWeek}
      />

      <CloseWeekDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        completedObjectives={closeCompletedObjectives}
        incompleteObjectives={closeIncompleteObjectives}
        goals={goals || []}
        onConfirmClose={closeWeek}
        isClosing={isClosingWeek}
      />

      <CarryOverObjectivesModal
        open={showCarryOverModal}
        onOpenChange={setShowCarryOverModal}
        incompleteObjectives={carryOverIncompleteObjectives}
        goals={goals || []}
        onConfirmCarryOver={async (objectivesWithWeeks) => {
          await carryOverObjectivesAsync(objectivesWithWeeks);
          setShowCarryOverModal(false);
          maybeNavigateToTargetWeek(objectivesWithWeeks);
        }}
        onDismissObjective={dismissObjective}
        onRestoreObjective={restoreObjective}
        dismissedObjectives={dismissedObjectives}
        isCarryingOver={isCarryOverModalCarrying}
        title="Carry Over From Previous Weeks"
        description="Select which incomplete objectives to carry over and choose their target week."
        defaultTargetWeek={currentWeekStart}
      />

      {/* Carry over from a closed week to the next week */}
      <CarryOverObjectivesModal
        open={showCarryOverFromClosedModal}
        onOpenChange={setShowCarryOverFromClosedModal}
        incompleteObjectives={closeIncompleteObjectives}
        goals={goals || []}
        onConfirmCarryOver={async (objectivesWithWeeks) => {
          await carryOverObjectivesAsync(objectivesWithWeeks);
          setShowCarryOverFromClosedModal(false);
          maybeNavigateToTargetWeek(objectivesWithWeeks);
        }}
        onDismissObjective={dismissObjective}
        onRestoreObjective={restoreObjective}
        dismissedObjectives={dismissedObjectives}
        isCarryingOver={isCarryOverModalCarrying}
        title="Carry Over to Next Week"
        description="Select which incomplete objectives to carry over and choose their target week."
        defaultTargetWeek={getNextWeekStart()}
      />
    </div>
  );
};

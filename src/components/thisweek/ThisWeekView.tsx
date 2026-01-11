import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { useGoals } from "@/hooks/useGoals";
import { useAuth } from "@/contexts/AuthContext";
import { WeeklyObjectivesList } from "@/components/goals/WeeklyObjectivesList";
import { WeekHeader } from "@/components/thisweek/WeekHeader";
import { WeeklyReflectionCard } from "@/components/thisweek/WeeklyReflectionCard";
import { ShareWeekCard } from "@/components/thisweek/ShareWeekCard";
import { ThisWeekSkeleton } from "@/components/thisweek/ThisWeekSkeleton";
import { ShareConfirmationDialog } from "@/components/thisweek/ShareConfirmationDialog";
import { HabitsDueThisWeek } from "@/components/thisweek/HabitsDueThisWeek";
import { CloseWeekDialog } from "@/components/thisweek/CloseWeekDialog";
import { WeekTransitionCard } from "@/components/thisweek/WeekTransitionCard";
import { PartnerCheckInsCard } from "@/components/thisweek/PartnerCheckInsCard";
import { useHabitStats } from "@/hooks/useHabitStats";
import { EndOfWeekReflection } from "@/components/habits/EndOfWeekReflection";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { useAllWeeklyObjectives } from "@/hooks/useAllWeeklyObjectives";
import { AISuggestionsCard } from "@/components/goals/AISuggestionsCard";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { CarryOverObjectivesModal } from "@/components/goals/CarryOverObjectivesModal";
import { useCarryOverObjectives } from "@/hooks/useCarryOverObjectives";
import { useWeekClose } from "@/hooks/useWeekClose";
import { toast } from "@/hooks/use-toast";

// Extracted hooks for better code organization
import { useWeeklyShare } from "@/hooks/useWeeklyShare";
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
    feedPost,
    createObjective,
    updateObjective,
    deleteObjective,
    deleteAllObjectives,
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

  // Week transition (combines close last week + planning + reflections)
  const {
    shouldShowTransition,
    lastWeekStart,
    lastWeekObjectives,
    lastWeekReflections,
    handleUpdateReflection: handleUpdateLastWeekReflection,
    handleCarryOver,
    handleSetIntention,
    handleCompleteTransition,
    isCarryingOver: isTransitionCarryingOver,
  } = useWeekTransition(currentWeekStart);

  // Carry-over modal for bringing incomplete objectives from past weeks
  const [showCarryOverModal, setShowCarryOverModal] = useState(false);
  // Carry-over modal for when viewing a closed week (carry to NEXT week)
  const [showCarryOverFromClosedModal, setShowCarryOverFromClosedModal] = useState(false);
  
  const {
    incompleteObjectives: carryOverIncompleteObjectives,
    carryOverObjectives,
    isCarryingOver: isCarryOverModalCarrying,
  } = useCarryOverObjectives(currentWeekStart);

  const hasIncompleteObjectivesFromPastWeeks = carryOverIncompleteObjectives.length > 0;

  // Calculate next week start for carrying over from closed week
  const getNextWeekStart = () => {
    return WeeklyProgressService.addDaysToWeekStart(currentWeekStart, 7);
  };

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
    handleReorderObjective,
    handleUpdateObjectiveSchedule,
    handleMoveObjectiveToWeek,
  } = useObjectiveHandlers({
    currentWeekStart,
    objectives,
    progressPost,
    createObjective,
    updateObjective,
    deleteObjective,
    incompleteReflections,
  });

  // Share functionality
  const {
    isSharing,
    showShareConfirmation,
    setShowShareConfirmation,
    handleRequestShare,
    handleConfirmShare,
    handleViewInCommunity,
  } = useWeeklyShare({
    userId: user?.id,
    currentWeekStart,
    objectives,
    progressNotes: progressPost?.notes || '',
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
  const hasShared = !!feedPost;

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
              <Button onClick={() => setShowCarryOverModal(true)} size="sm">
                Review & Carry Over
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

      {/* Partner Check-ins Card - shows accountability partner activity */}
      {isCurrentWeek && <PartnerCheckInsCard />}

      {/* Duolingo is now integrated inside HabitsDueThisWeek */}

      {isCurrentWeek && habitStats.length > 0 && (
        <HabitsDueThisWeek
          habits={habitStats}
          objectives={objectives || []}
          onToggleObjective={handleToggleObjective}
        />
      )}

      {aiEnabled && isCurrentWeek && !isReadOnly && (suggestions.length > 0 || isSuggestionsLoading) && (
        <AISuggestionsCard
          suggestions={suggestions}
          isLoading={isSuggestionsLoading}
          onAddSuggestion={handleAddSuggestion}
          onRefresh={handleRefreshSuggestions}
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
            onReorderObjective={handleReorderObjective}
            onUpdateObjectiveSchedule={handleUpdateObjectiveSchedule}
            currentWeekStart={currentWeekStart}
            onMoveObjectiveToWeek={handleMoveObjectiveToWeek}
            pendingUpdateIds={pendingUpdateIds}
            recentlySavedIds={recentlySavedIds}
          />
        </CardContent>
      </Card>

      {/* Show incomplete objectives reflection - any time during current week when there are incomplete objectives */}
      {isCurrentWeek && !isReadOnly && objectives && objectives.some(obj => !obj.is_completed) && (
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

      <ShareWeekCard
        hasShared={hasShared}
        isCurrentWeek={isCurrentWeek}
        isSharing={isSharing}
        feedPost={feedPost}
        objectives={objectives || []}
        reflectionValue={progressPost?.notes || ""}
        onShareWeek={handleRequestShare}
        onViewInCommunity={() => handleViewInCommunity(feedPost?.id)}
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

      <ShareConfirmationDialog
        isOpen={showShareConfirmation}
        onClose={() => setShowShareConfirmation(false)}
        onConfirm={handleConfirmShare}
        isSharing={isSharing}
        goals={(goals || []).filter(g => g.status === 'in_progress' || g.status === 'not_started').map(g => ({ id: g.id, title: g.title }))}
      />

      <CarryOverObjectivesModal
        open={showCarryOverModal}
        onOpenChange={setShowCarryOverModal}
        incompleteObjectives={carryOverIncompleteObjectives}
        goals={goals || []}
        onConfirmCarryOver={(objectivesWithWeeks) => {
          carryOverObjectives(objectivesWithWeeks);
          setShowCarryOverModal(false);
        }}
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
          await WeeklyProgressService.carryOverObjectivesWithTargets(objectivesWithWeeks);
          setShowCarryOverFromClosedModal(false);
          
          // Invalidate queries for all target weeks
          const targetWeeks = new Set(objectivesWithWeeks.map(o => o.targetWeek));
          targetWeeks.forEach(() => {
            // Queries will be invalidated by React Query automatically on navigation
          });
          
          toast({
            title: "Success",
            description: `${objectivesWithWeeks.length} objective${objectivesWithWeeks.length !== 1 ? 's' : ''} carried over!`,
          });
        }}
        isCarryingOver={false}
        title="Carry Over to Next Week"
        description="Select which incomplete objectives to carry over and choose their target week."
        defaultTargetWeek={getNextWeekStart()}
      />
    </div>
  );
};

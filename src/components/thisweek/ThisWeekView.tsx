import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useHabitStats } from "@/hooks/useHabitStats";
import { EndOfWeekReflection } from "@/components/habits/EndOfWeekReflection";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { useAllWeeklyObjectives } from "@/hooks/useAllWeeklyObjectives";
import { AISuggestionsCard } from "@/components/goals/AISuggestionsCard";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { HabitsService } from "@/services/habitsService";

// Extracted hooks for better code organization
import { useWeeklyShare } from "@/hooks/useWeeklyShare";
import { useObjectiveHandlers } from "@/hooks/useObjectiveHandlers";
import { useIncompleteReflections } from "@/hooks/useIncompleteReflections";
import { useAISuggestions } from "@/hooks/useAISuggestions";

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
  const isEndOfWeek = HabitsService.isEndOfWeek();
  const isReadOnly = isWeekCompleted;

  // Incomplete reflections handling
  const { incompleteReflections, handleUpdateIncompleteReflection } = useIncompleteReflections(
    progressPost,
    currentWeekStart
  );

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

      {isEndOfWeek && isCurrentWeek && !isReadOnly && objectives && objectives.some(obj => !obj.is_completed) && (
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
        isWeekCompleted={isWeekCompleted}
      />

      <ShareConfirmationDialog
        isOpen={showShareConfirmation}
        onClose={() => setShowShareConfirmation(false)}
        onConfirm={handleConfirmShare}
        isSharing={isSharing}
        goals={(goals || []).filter(g => g.status === 'in_progress' || g.status === 'not_started').map(g => ({ id: g.id, title: g.title }))}
      />
    </div>
  );
};

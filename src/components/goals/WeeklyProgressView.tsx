
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { useGoals } from "@/hooks/useGoals";
import { PreviousWeekSummary } from "./PreviousWeekSummary";
import { WeeklyProgressHeader } from "./WeeklyProgressHeader";
import { WeeklyObjectivesList } from "./WeeklyObjectivesList";
import { WeeklyProgressNotesSection } from "./WeeklyProgressNotesSection";
import { WeeklyProgressActions } from "./WeeklyProgressActions";
import { WeeklyProgressService } from "@/services/weeklyProgressService";

export const WeeklyProgressView = () => {
  const { goals } = useGoals();
  const [progressNotes, setProgressNotes] = useState("");
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(
    WeeklyProgressService.getWeekStart()
  );
  
  const {
    objectives,
    progressPost,
    createObjective,
    updateObjective,
    deleteObjective,
    updateProgressNotes,
    completeWeek,
    uncompleteWeek,
    weekStart,
    weekRange,
    weekNumber,
    isCreating,
    isSavingNotes,
    isCompletingWeek,
    isUncompletingWeek,
  } = useWeeklyProgress(currentWeekStart);

  // Debug auth state
  useEffect(() => {
    console.log('WeeklyProgressView - Current week start:', currentWeekStart);
    console.log('WeeklyProgressView - Objectives count:', objectives?.length || 0);
    console.log('WeeklyProgressView - Progress post:', progressPost ? 'exists' : 'null');
  }, [currentWeekStart, objectives, progressPost]);

  // Initialize progress notes when progressPost changes
  useEffect(() => {
    console.log('Progress post changed:', progressPost);
    setProgressNotes(progressPost?.notes || "");
  }, [progressPost]);

  const handlePreviousWeek = () => {
    console.log('Previous week button clicked!');
    const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
    // Subtract exactly 7 days to move to previous week
    currentDate.setUTCDate(currentDate.getUTCDate() - 7);
    const newWeekStart = WeeklyProgressService.getWeekStart(currentDate);
    console.log('Previous week navigation:', currentWeekStart, '->', newWeekStart);
    setCurrentWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    console.log('Next week button clicked!');
    const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
    // Add exactly 7 days to move to next week
    currentDate.setUTCDate(currentDate.getUTCDate() + 7);
    const newWeekStart = WeeklyProgressService.getWeekStart(currentDate);
    console.log('Next week navigation:', currentWeekStart, '->', newWeekStart);
    setCurrentWeekStart(newWeekStart);
  };

  const handleAddObjective = (text: string, goalId?: string) => {
    console.log('Adding objective:', text, 'with goal:', goalId);
    createObjective({
      text,
      goal_id: goalId,
      week_start: currentWeekStart,
    });
  };

  const handleToggleObjective = (id: string, isCompleted: boolean) => {
    console.log('Toggling objective:', id, 'to', !isCompleted);
    updateObjective(id, { is_completed: !isCompleted });
  };

  const handleUpdateObjectiveText = (id: string, text: string) => {
    console.log('Updating objective text:', id, text);
    updateObjective(id, { text });
  };

  const handleDeleteObjective = (id: string) => {
    console.log('Deleting objective:', id);
    deleteObjective(id);
  };

  const handleSaveNotes = () => {
    console.log('Saving notes:', progressNotes);
    updateProgressNotes(progressNotes);
  };

  const handleCompleteWeek = () => {
    console.log('Completing week:', weekStart);
    completeWeek();
  };

  const handleEditWeek = () => {
    console.log('Editing week:', weekStart);
    uncompleteWeek();
  };

  const completedCount = objectives?.filter(obj => obj.is_completed).length || 0;
  const totalCount = objectives?.length || 0;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isWeekCompleted = progressPost?.is_completed || false;

  // Don't render if essential data is still loading
  if (!objectives || !goals) {
    return (
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="p-6">
          <div className="text-center text-white">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <WeeklyProgressHeader
          weekRange={weekRange}
          weekNumber={weekNumber}
          isWeekCompleted={isWeekCompleted}
          completedCount={completedCount}
          totalCount={totalCount}
          completionPercentage={completionPercentage}
          onPreviousWeek={handlePreviousWeek}
          onNextWeek={handleNextWeek}
        />
      </CardHeader>
      
      <CardContent className="space-y-6">
        <PreviousWeekSummary currentWeekStart={currentWeekStart} />

        <WeeklyObjectivesList
          objectives={objectives}
          goals={goals}
          isWeekCompleted={isWeekCompleted}
          isCreating={isCreating}
          onToggleObjective={handleToggleObjective}
          onUpdateObjectiveText={handleUpdateObjectiveText}
          onDeleteObjective={handleDeleteObjective}
          onAddObjective={handleAddObjective}
        />

        <WeeklyProgressNotesSection
          progressNotes={progressNotes}
          isWeekCompleted={isWeekCompleted}
          onNotesChange={setProgressNotes}
        />

        <WeeklyProgressActions
          isWeekCompleted={isWeekCompleted}
          weekNumber={weekNumber}
          isSavingNotes={isSavingNotes}
          isCompletingWeek={isCompletingWeek}
          isUncompletingWeek={isUncompletingWeek}
          onSaveNotes={handleSaveNotes}
          onCompleteWeek={handleCompleteWeek}
          onEditWeek={handleEditWeek}
        />
      </CardContent>
    </Card>
  );
};

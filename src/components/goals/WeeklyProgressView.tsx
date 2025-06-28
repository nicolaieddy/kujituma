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
  const [progressNotes, setProgressNotes] = useState("");
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(
    WeeklyProgressService.getWeekStart()
  );
  
  const { goals } = useGoals();
  
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

  // Initialize progress notes when progressPost changes
  useEffect(() => {
    console.log('Progress post changed:', progressPost);
    setProgressNotes(progressPost?.notes || "");
  }, [progressPost]);

  const handlePreviousWeek = () => {
    // Parse the current week start date properly
    const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
    console.log('Current date for previous week calc:', currentDate.toISOString());
    
    // Subtract 7 days to get previous week
    const previousWeekDate = new Date(currentDate.getTime() - (7 * 24 * 60 * 60 * 1000));
    console.log('Previous week date:', previousWeekDate.toISOString());
    
    const newWeekStart = WeeklyProgressService.getWeekStart(previousWeekDate);
    console.log('Previous week navigation:', currentWeekStart, '->', newWeekStart);
    setCurrentWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    // Parse the current week start date properly
    const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
    console.log('Current date for next week calc:', currentDate.toISOString());
    
    // Add 7 days to get next week
    const nextWeekDate = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000));
    console.log('Next week date:', nextWeekDate.toISOString());
    
    const newWeekStart = WeeklyProgressService.getWeekStart(nextWeekDate);
    console.log('Next week navigation:', currentWeekStart, '->', newWeekStart);
    setCurrentWeekStart(newWeekStart);
  };

  const handleAddObjective = (text: string) => {
    console.log('Adding objective:', text);
    createObjective({
      text,
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

  const handleUpdateObjectiveGoal = (id: string, goalId: string | null) => {
    console.log('Updating objective goal link:', id, goalId);
    updateObjective(id, { goal_id: goalId });
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

  const completedCount = objectives.filter(obj => obj.is_completed).length;
  const totalCount = objectives.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isWeekCompleted = progressPost?.is_completed || false;

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
          onUpdateObjectiveGoal={handleUpdateObjectiveGoal}
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

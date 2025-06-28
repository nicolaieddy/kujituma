
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
  
  console.log('WeeklyProgressView render - currentWeekStart:', currentWeekStart);
  
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

  console.log('WeeklyProgressView - weekStart:', weekStart, 'weekRange:', weekRange);

  // Initialize progress notes when progressPost changes
  useEffect(() => {
    console.log('Progress post changed:', progressPost);
    setProgressNotes(progressPost?.notes || "");
  }, [progressPost]);

  const handlePreviousWeek = () => {
    try {
      console.log('Previous week clicked, current:', currentWeekStart);
      
      // Create date from the week start string
      const currentDate = new Date(currentWeekStart);
      console.log('Parsed current date:', currentDate.toISOString());
      
      // Subtract 7 days
      currentDate.setDate(currentDate.getDate() - 7);
      console.log('Previous week date:', currentDate.toISOString());
      
      // Get the new week start
      const newWeekStart = WeeklyProgressService.getWeekStart(currentDate);
      console.log('Previous week navigation:', currentWeekStart, '->', newWeekStart);
      setCurrentWeekStart(newWeekStart);
    } catch (error) {
      console.error('Error in handlePreviousWeek:', error);
      // Fallback to current week if there's an error
      setCurrentWeekStart(WeeklyProgressService.getWeekStart());
    }
  };

  const handleNextWeek = () => {
    try {
      console.log('Next week clicked, current:', currentWeekStart);
      
      // Create date from the week start string
      const currentDate = new Date(currentWeekStart);
      console.log('Parsed current date:', currentDate.toISOString());
      
      // Add 7 days
      currentDate.setDate(currentDate.getDate() + 7);
      console.log('Next week date:', currentDate.toISOString());
      
      // Get the new week start
      const newWeekStart = WeeklyProgressService.getWeekStart(currentDate);
      console.log('Next week navigation:', currentWeekStart, '->', newWeekStart);
      setCurrentWeekStart(newWeekStart);
    } catch (error) {
      console.error('Error in handleNextWeek:', error);
      // Fallback to current week if there's an error
      setCurrentWeekStart(WeeklyProgressService.getWeekStart());
    }
  };

  const handleAddObjective = (text: string) => {
    try {
      console.log('Adding objective:', text);
      createObjective({
        text,
        week_start: currentWeekStart,
      });
    } catch (error) {
      console.error('Error adding objective:', error);
    }
  };

  const handleToggleObjective = (id: string, isCompleted: boolean) => {
    try {
      console.log('Toggling objective:', id, 'to', !isCompleted);
      updateObjective(id, { is_completed: !isCompleted });
    } catch (error) {
      console.error('Error toggling objective:', error);
    }
  };

  const handleUpdateObjectiveText = (id: string, text: string) => {
    try {
      console.log('Updating objective text:', id, text);
      updateObjective(id, { text });
    } catch (error) {
      console.error('Error updating objective text:', error);
    }
  };

  const handleUpdateObjectiveGoal = (id: string, goalId: string | null) => {
    try {
      console.log('Updating objective goal link:', id, goalId);
      updateObjective(id, { goal_id: goalId });
    } catch (error) {
      console.error('Error updating objective goal:', error);
    }
  };

  const handleDeleteObjective = (id: string) => {
    try {
      console.log('Deleting objective:', id);
      deleteObjective(id);
    } catch (error) {
      console.error('Error deleting objective:', error);
    }
  };

  const handleSaveNotes = () => {
    try {
      console.log('Saving notes:', progressNotes);
      updateProgressNotes(progressNotes);
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  const handleCompleteWeek = () => {
    try {
      console.log('Completing week:', weekStart);
      completeWeek();
    } catch (error) {
      console.error('Error completing week:', error);
    }
  };

  const handleEditWeek = () => {
    try {
      console.log('Editing week:', weekStart);
      uncompleteWeek();
    } catch (error) {
      console.error('Error editing week:', error);
    }
  };

  // Add error boundary-like behavior
  try {
    const completedCount = objectives.filter(obj => obj.is_completed).length;
    const totalCount = objectives.length;
    const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const isWeekCompleted = progressPost?.is_completed || false;

    console.log('WeeklyProgressView about to render - objectives:', objectives.length, 'completed:', completedCount);

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
  } catch (error) {
    console.error('Error rendering WeeklyProgressView:', error);
    return (
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="p-6">
          <div className="text-white text-center">
            <p>Error loading weekly progress</p>
            <p className="text-sm text-white/60 mt-2">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    );
  }
};

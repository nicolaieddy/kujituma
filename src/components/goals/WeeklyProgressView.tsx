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
  console.log('WeeklyProgressView: Component rendering...');
  
  const [progressNotes, setProgressNotes] = useState("");
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(() => {
    try {
      const weekStart = WeeklyProgressService.getWeekStart();
      console.log('WeeklyProgressView: Initial week start:', weekStart);
      return weekStart;
    } catch (error) {
      console.error('WeeklyProgressView: Error getting week start:', error);
      return new Date().toISOString().split('T')[0]; // fallback to today
    }
  });
  
  console.log('WeeklyProgressView: About to call useGoals...');
  const { goals } = useGoals();
  console.log('WeeklyProgressView: Goals loaded:', goals?.length || 0);
  
  console.log('WeeklyProgressView: About to call useWeeklyProgress with:', currentWeekStart);
  const weeklyProgressData = useWeeklyProgress(currentWeekStart);
  console.log('WeeklyProgressView: useWeeklyProgress returned:', !!weeklyProgressData);
  
  // Handle loading and error states
  if (!weeklyProgressData) {
    console.error('WeeklyProgressView: useWeeklyProgress returned null/undefined');
    return (
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="p-6">
          <div className="text-center text-white">
            Unable to load weekly progress data. Please try refreshing the page.
          </div>
        </CardContent>
      </Card>
    );
  }

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
  } = weeklyProgressData;
  
  console.log('WeeklyProgressView: Weekly progress data loaded:', {
    objectivesCount: objectives?.length || 0,
    progressPost: !!progressPost,
    weekStart,
    weekRange,
    weekNumber
  });

  // Initialize progress notes when progressPost changes
  useEffect(() => {
    console.log('Progress post changed:', progressPost);
    setProgressNotes(progressPost?.notes || "");
  }, [progressPost]);

  const handlePreviousWeek = () => {
    try {
      // Parse the current week start date properly
      const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
      console.log('Current date for previous week calc:', currentDate.toISOString());
      
      // Subtract 7 days to get previous week
      const previousWeekDate = new Date(currentDate.getTime() - (7 * 24 * 60 * 60 * 1000));
      console.log('Previous week date:', previousWeekDate.toISOString());
      
      const newWeekStart = WeeklyProgressService.getWeekStart(previousWeekDate);
      console.log('Previous week navigation:', currentWeekStart, '->', newWeekStart);
      setCurrentWeekStart(newWeekStart);
    } catch (error) {
      console.error('Error in handlePreviousWeek:', error);
    }
  };

  const handleNextWeek = () => {
    try {
      // Parse the current week start date properly
      const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
      console.log('Current date for next week calc:', currentDate.toISOString());
      
      // Add 7 days to get next week
      const nextWeekDate = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000));
      console.log('Next week date:', nextWeekDate.toISOString());
      
      const newWeekStart = WeeklyProgressService.getWeekStart(nextWeekDate);
      console.log('Next week navigation:', currentWeekStart, '->', newWeekStart);
      setCurrentWeekStart(newWeekStart);
    } catch (error) {
      console.error('Error in handleNextWeek:', error);
    }
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

  const safeObjectives = objectives || [];
  const completedCount = safeObjectives.filter(obj => obj.is_completed).length;
  const totalCount = safeObjectives.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isWeekCompleted = progressPost?.is_completed || false;

  try {
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
            objectives={safeObjectives}
            goals={goals || []}
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
            weekNumber={weekNumber || 1}
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
    console.error('WeeklyProgressView: Render error:', error);
    return (
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="p-6">
          <div className="text-center text-red-400">
            Error rendering WeeklyProgressView: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }
};

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { PreviousWeekSummary } from "./PreviousWeekSummary";
import { WeeklyProgressHeader } from "./WeeklyProgressHeader";
import { WeeklyObjectivesList } from "./WeeklyObjectivesList";
import { WeeklyProgressNotesSection } from "./WeeklyProgressNotesSection";
import { WeeklyProgressActions } from "./WeeklyProgressActions";

export const WeeklyProgressView = () => {
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(
    WeeklyProgressService.getWeekStart()
  );
  const [progressNotes, setProgressNotes] = useState("");
  
  console.log('WeeklyProgressView render - selectedWeekStart:', selectedWeekStart);

  const {
    objectives,
    progressPost,
    createObjective,
    updateObjective,
    deleteObjective,
    updateProgressNotes,
    completeWeek,
    uncompleteWeek,
    weekRange,
    weekNumber,
    isCreating,
    isSavingNotes,
    isCompletingWeek,
    isUncompletingWeek,
  } = useWeeklyProgress(selectedWeekStart);

  // Initialize progress notes when progressPost changes
  useEffect(() => {
    console.log('Progress post changed:', progressPost);
    setProgressNotes(progressPost?.notes || "");
  }, [progressPost]);

  const navigateToWeek = (direction: 'previous' | 'next') => {
    console.log(`Navigating to ${direction} week from:`, selectedWeekStart);
    
    try {
      // Parse current week start as a proper date
      const currentDate = new Date(selectedWeekStart + 'T00:00:00.000Z');
      console.log('Current date parsed:', currentDate.toISOString());
      
      // Calculate the target date
      const targetDate = new Date(currentDate);
      const daysToAdd = direction === 'next' ? 7 : -7;
      targetDate.setUTCDate(targetDate.getUTCDate() + daysToAdd);
      console.log('Target date calculated:', targetDate.toISOString());
      
      // Get the week start for the target date
      const newWeekStart = WeeklyProgressService.getWeekStart(targetDate);
      console.log('New week start:', newWeekStart);
      
      // Update state
      setSelectedWeekStart(newWeekStart);
      console.log('Week navigation completed:', selectedWeekStart, '->', newWeekStart);
      
    } catch (error) {
      console.error('Error in week navigation:', error);
      // Fallback to simple date arithmetic
      const fallbackDate = new Date(selectedWeekStart);
      fallbackDate.setDate(fallbackDate.getDate() + (direction === 'next' ? 7 : -7));
      const fallbackWeekStart = WeeklyProgressService.getWeekStart(fallbackDate);
      setSelectedWeekStart(fallbackWeekStart);
      console.log('Fallback navigation used:', fallbackWeekStart);
    }
  };

  const handlePreviousWeek = () => {
    console.log('Previous week button clicked');
    navigateToWeek('previous');
  };

  const handleNextWeek = () => {
    console.log('Next week button clicked');
    navigateToWeek('next');
  };

  const handleAddObjective = (text: string) => {
    console.log('Adding objective:', text);
    createObjective({
      text,
      week_start: selectedWeekStart,
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
    console.log('Completing week:', selectedWeekStart);
    completeWeek();
  };

  const handleEditWeek = () => {
    console.log('Editing week:', selectedWeekStart);
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
        <PreviousWeekSummary currentWeekStart={selectedWeekStart} />

        <WeeklyObjectivesList
          objectives={objectives}
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

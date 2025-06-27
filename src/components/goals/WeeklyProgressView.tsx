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
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(WeeklyProgressService.getWeekStart());
  const [progressNotes, setProgressNotes] = useState("");
  
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
    setProgressNotes(progressPost?.notes || "");
  }, [progressPost]);

  const handlePreviousWeek = () => {
    console.log('handlePreviousWeek called, current selectedWeekStart:', selectedWeekStart);
    
    // Parse the current week start date properly
    const currentDate = new Date(selectedWeekStart);
    console.log('Parsed current date:', currentDate);
    
    // Go back 7 days
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 7);
    console.log('Previous date calculated:', previousDate);
    
    // Get the week start for the previous week
    const newWeekStart = WeeklyProgressService.getWeekStart(previousDate);
    console.log('New week start:', newWeekStart);
    
    // Update state
    setSelectedWeekStart(newWeekStart);
    console.log('State updated to:', newWeekStart);
  };

  const handleNextWeek = () => {
    console.log('handleNextWeek called, current selectedWeekStart:', selectedWeekStart);
    
    // Parse the current week start date properly
    const currentDate = new Date(selectedWeekStart);
    console.log('Parsed current date:', currentDate);
    
    // Go forward 7 days
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 7);
    console.log('Next date calculated:', nextDate);
    
    // Get the week start for the next week
    const newWeekStart = WeeklyProgressService.getWeekStart(nextDate);
    console.log('New week start:', newWeekStart);
    
    // Update state
    setSelectedWeekStart(newWeekStart);
    console.log('State updated to:', newWeekStart);
  };

  const handleAddObjective = (text: string) => {
    createObjective({
      text,
      week_start: selectedWeekStart,
    });
  };

  const handleToggleObjective = (id: string, isCompleted: boolean) => {
    updateObjective(id, { is_completed: !isCompleted });
  };

  const handleUpdateObjectiveText = (id: string, text: string) => {
    updateObjective(id, { text });
  };

  const handleDeleteObjective = (id: string) => {
    deleteObjective(id);
  };

  const handleSaveNotes = () => {
    updateProgressNotes(progressNotes);
  };

  const handleCompleteWeek = () => {
    completeWeek();
  };

  const handleEditWeek = () => {
    uncompleteWeek();
  };

  const completedCount = objectives.filter(obj => obj.is_completed).length;
  const totalCount = objectives.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isWeekCompleted = progressPost?.is_completed || false;

  console.log('WeeklyProgressView render - selectedWeekStart:', selectedWeekStart, 'weekRange:', weekRange);

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

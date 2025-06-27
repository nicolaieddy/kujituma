
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
    const currentDate = new Date(selectedWeekStart);
    currentDate.setDate(currentDate.getDate() - 7);
    const newWeekStart = WeeklyProgressService.getWeekStart(currentDate);
    console.log('Previous week navigation:', selectedWeekStart, '->', newWeekStart);
    setSelectedWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    const currentDate = new Date(selectedWeekStart);
    currentDate.setDate(currentDate.getDate() + 7);
    const newWeekStart = WeeklyProgressService.getWeekStart(currentDate);
    console.log('Next week navigation:', selectedWeekStart, '->', newWeekStart);
    setSelectedWeekStart(newWeekStart);
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


import { useState } from "react";
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { useGoals } from "@/hooks/useGoals";
import { WeeklyProgressHeader } from "./WeeklyProgressHeader";
import { AddObjectiveForm } from "./AddObjectiveForm";
import { ObjectivesList } from "./ObjectivesList";
import { ProgressNotes } from "./ProgressNotes";
import { PreviousWeekSummary } from "./PreviousWeekSummary";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WeeklyProgressService } from "@/services/weeklyProgressService";

interface WeeklyProgressProps {
  selectedWeek?: string;
}

export const WeeklyProgress = ({ selectedWeek }: WeeklyProgressProps) => {
  const { goals } = useGoals();
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(
    selectedWeek || WeeklyProgressService.getWeekStart()
  );
  
  const {
    objectives,
    progressPost,
    createObjective,
    updateObjective,
    deleteObjective,
    updateProgressNotes,
    weekRange,
    weekNumber,
    isCreating,
    isUpdating,
    isSavingNotes,
  } = useWeeklyProgress(currentWeekStart);

  const handlePreviousWeek = () => {
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() - 7);
    const newWeekStart = WeeklyProgressService.getWeekStart(currentDate);
    console.log('Previous week navigation:', currentWeekStart, '->', newWeekStart);
    setCurrentWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() + 7);
    const newWeekStart = WeeklyProgressService.getWeekStart(currentDate);
    console.log('Next week navigation:', currentWeekStart, '->', newWeekStart);
    setCurrentWeekStart(newWeekStart);
  };

  const handleCreateObjective = (text: string, goalId?: string) => {
    createObjective({
      text,
      goal_id: goalId,
      week_start: currentWeekStart,
    });
  };

  const handleToggleObjective = (id: string, isCompleted: boolean) => {
    updateObjective(id, { is_completed: !isCompleted });
  };

  const handleUpdateObjectiveText = (id: string, text: string) => {
    updateObjective(id, { text });
  };

  const handleSaveNotes = (notes: string) => {
    updateProgressNotes(notes);
  };

  const completedCount = objectives.filter(obj => obj.is_completed).length;
  const totalCount = objectives.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isWeekCompleted = progressPost?.is_completed || false;

  // Check if this is the current week
  const currentWeek = WeeklyProgressService.getWeekStart();
  const isCurrentWeek = currentWeekStart === currentWeek;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousWeek}
          className="text-white/60 hover:text-white hover:bg-white/20"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
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

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextWeek}
          className="text-white/60 hover:text-white hover:bg-white/20"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <PreviousWeekSummary currentWeekStart={currentWeekStart} />

      <AddObjectiveForm
        goals={goals}
        onCreateObjective={handleCreateObjective}
        isCreating={isCreating}
      />

      <ObjectivesList
        objectives={objectives}
        goals={goals}
        onToggleObjective={handleToggleObjective}
        onUpdateObjectiveText={handleUpdateObjectiveText}
        onDeleteObjective={deleteObjective}
      />

      <ProgressNotes
        initialNotes={progressPost?.notes || ""}
        onSaveNotes={handleSaveNotes}
        isSaving={isSavingNotes}
      />
    </div>
  );
};

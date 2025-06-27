
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { useGoals } from "@/hooks/useGoals";
import { WeeklyProgressHeader } from "./WeeklyProgressHeader";
import { AddObjectiveForm } from "./AddObjectiveForm";
import { ObjectivesList } from "./ObjectivesList";
import { ProgressNotes } from "./ProgressNotes";

interface WeeklyProgressProps {
  selectedWeek?: string;
}

export const WeeklyProgress = ({ selectedWeek }: WeeklyProgressProps) => {
  const { goals } = useGoals();
  const {
    objectives,
    progressPost,
    createObjective,
    updateObjective,
    deleteObjective,
    updateProgressNotes,
    weekRange,
    weekStart,
    isCreating,
    isUpdating,
    isSavingNotes,
  } = useWeeklyProgress(selectedWeek);

  const handleCreateObjective = (text: string, goalId?: string) => {
    createObjective({
      text,
      goal_id: goalId,
      week_start: weekStart,
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

  return (
    <div className="space-y-6">
      <WeeklyProgressHeader 
        weekRange={weekRange}
        completedCount={completedCount}
        totalCount={totalCount}
      />

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

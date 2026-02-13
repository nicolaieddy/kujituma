import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { WeeklyObjective, WeeklyProgressPost } from "@/types/weeklyProgress";

interface UseObjectiveHandlersProps {
  currentWeekStart: string;
  objectives: WeeklyObjective[] | undefined;
  progressPost: WeeklyProgressPost | null | undefined;
  createObjective: (data: { text: string; week_start: string; goal_id: string | null }) => void;
  updateObjective: (id: string, data: Record<string, unknown>) => void;
  deleteObjective: (id: string) => void;
  reorderObjectives: (updates: { id: string; order_index: number }[]) => void;
  incompleteReflections: Record<string, string>;
}

export const useObjectiveHandlers = ({
  currentWeekStart,
  objectives,
  progressPost,
  createObjective,
  updateObjective,
  deleteObjective,
  reorderObjectives,
  incompleteReflections,
}: UseObjectiveHandlersProps) => {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const handleUpdateObjectiveGoal = useCallback((id: string, goalId: string | null) => {
    updateObjective(id, { goal_id: goalId });
  }, [updateObjective]);

  const handleAddObjective = useCallback(async (text: string, goalId?: string) => {
    setIsCreating(true);
    try {
      await createObjective({
        text,
        week_start: currentWeekStart,
        goal_id: goalId || null,
      });
    } finally {
      setIsCreating(false);
    }
  }, [createObjective, currentWeekStart]);

  const handleToggleObjective = useCallback((id: string, isCompleted: boolean) => {
    updateObjective(id, { is_completed: !isCompleted });
  }, [updateObjective]);

  const handleUpdateObjectiveText = useCallback((id: string, text: string) => {
    updateObjective(id, { text });
  }, [updateObjective]);

  const handleDeleteObjective = useCallback((id: string) => {
    deleteObjective(id);
  }, [deleteObjective]);

  const handleReorderObjectives = useCallback((updates: { id: string; order_index: number }[]) => {
    reorderObjectives(updates);
  }, [reorderObjectives]);

  const handleUpdateObjectiveSchedule = useCallback((id: string, day: string | null, time: string | null) => {
    updateObjective(id, { scheduled_day: day, scheduled_time: time });
  }, [updateObjective]);

  const handleMoveObjectiveToWeek = useCallback(async (
    objectiveId: string,
    newWeekStart: string,
    scheduledDay: string
  ) => {
    try {
      const objective = objectives?.find(obj => obj.id === objectiveId);
      
      if (objective) {
        await WeeklyProgressService.createWeeklyObjective({
          text: objective.text,
          goal_id: objective.goal_id || undefined,
          week_start: newWeekStart,
          scheduled_day: scheduledDay,
          scheduled_time: objective.scheduled_time,
        });
      }
      
      const movedReflection = `[MOVED] Rescheduled to week of ${newWeekStart}`;
      await WeeklyProgressService.upsertWeeklyProgressPostWithReflections(
        currentWeekStart,
        progressPost?.notes || '',
        { ...incompleteReflections, [objectiveId]: movedReflection }
      );
      
      await deleteObjective(objectiveId);
      
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-progress-post'] });
      
      toast({
        title: "Objective rescheduled",
        description: "The objective has been moved to a different week and marked as rescheduled.",
      });
    } catch (error) {
      console.error('Error moving objective to week:', error);
      toast({
        title: "Error",
        description: "Failed to move objective. Please try again.",
        variant: "destructive",
      });
    }
  }, [objectives, currentWeekStart, progressPost?.notes, incompleteReflections, deleteObjective, queryClient]);

  return {
    isCreating,
    handleUpdateObjectiveGoal,
    handleAddObjective,
    handleToggleObjective,
    handleUpdateObjectiveText,
    handleDeleteObjective,
    handleReorderObjectives,
    handleUpdateObjectiveSchedule,
    handleMoveObjectiveToWeek,
  };
};

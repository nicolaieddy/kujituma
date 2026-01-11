import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { WeeklyObjective } from "@/types/weeklyProgress";

interface UseWeekCloseProps {
  currentWeekStart: string;
  objectives: WeeklyObjective[];
  incompleteReflections: Record<string, string>;
  progressNotes: string;
}

export const useWeekClose = ({
  currentWeekStart,
  objectives,
  incompleteReflections,
  progressNotes,
}: UseWeekCloseProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  // Get next week start
  const getNextWeekStart = () => {
    const [year, month, day] = currentWeekStart.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  };

  const closeWeekMutation = useMutation({
    mutationFn: async ({ carryOverIds }: { carryOverIds: string[] }) => {
      // Save reflections first
      await WeeklyProgressService.upsertWeeklyProgressPostWithReflections(
        currentWeekStart,
        progressNotes,
        incompleteReflections
      );

      // Carry over selected objectives to next week
      if (carryOverIds.length > 0) {
        const nextWeekStart = getNextWeekStart();
        await WeeklyProgressService.carryOverObjectives(carryOverIds, nextWeekStart);
      }

      // Mark week as completed
      await WeeklyProgressService.completeWeek(currentWeekStart);

      return { carryOverCount: carryOverIds.length };
    },
    onSuccess: ({ carryOverCount }) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['weekly-progress-post'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['incomplete-objectives'] });
      
      const message = carryOverCount > 0
        ? `Week closed! ${carryOverCount} objective${carryOverCount !== 1 ? 's' : ''} carried to next week.`
        : "Week closed successfully!";
      
      toast({ 
        title: "Week Closed", 
        description: message,
      });
      
      setShowCloseDialog(false);
    },
    onError: (error) => {
      console.error('Error closing week:', error);
      toast({ 
        title: "Error", 
        description: "Failed to close week. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  const incompleteObjectives = objectives.filter(obj => !obj.is_completed);
  const completedObjectives = objectives.filter(obj => obj.is_completed);

  const closeWeek = (carryOverIds: string[]) => {
    closeWeekMutation.mutate({ carryOverIds });
  };

  return {
    showCloseDialog,
    setShowCloseDialog,
    closeWeek,
    isClosingWeek: closeWeekMutation.isPending,
    incompleteObjectives,
    completedObjectives,
  };
};

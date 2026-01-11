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
      const nextWeekStart = getNextWeekStart();
      console.log('[useWeekClose] Closing week:', currentWeekStart);
      console.log('[useWeekClose] Carrying over to:', nextWeekStart);
      console.log('[useWeekClose] Carry over IDs:', carryOverIds);
      
      // Save reflections first
      await WeeklyProgressService.upsertWeeklyProgressPostWithReflections(
        currentWeekStart,
        progressNotes,
        incompleteReflections
      );

      // Carry over selected objectives to next week
      let carriedOver = 0;
      if (carryOverIds.length > 0) {
        const newObjectives = await WeeklyProgressService.carryOverObjectives(carryOverIds, nextWeekStart);
        carriedOver = newObjectives.length;
        console.log('[useWeekClose] Carried over objectives:', newObjectives);
      }

      // Mark week as completed
      await WeeklyProgressService.completeWeek(currentWeekStart);

      return { carryOverCount: carriedOver, nextWeekStart };
    },
    onSuccess: ({ carryOverCount, nextWeekStart }) => {
      // Invalidate all relevant queries including the next week
      queryClient.invalidateQueries({ queryKey: ['weekly-progress-post'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['incomplete-objectives'] });
      
      // Also invalidate next week specifically to ensure carried-over objectives show up
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, nextWeekStart] });
      
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
      console.error('[useWeekClose] Error closing week:', error);
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

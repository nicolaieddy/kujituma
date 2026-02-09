import { useState, useCallback, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { HabitsService } from "@/services/habitsService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useWeeklyDashboardData } from "./useWeeklyDashboardData";

/**
 * Weekly transition = close the previous week + complete planning for the upcoming week.
 *
 * Key detail: on Sundays, the user is still "in" the week ending today,
 * but planning should apply to NEXT week's week_start.
 */
export const useWeekTransition = (displayedWeekStart: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Local UI state (session-only): used to instantly hide/reopen without waiting for network.
  const [isTransitionDismissed, setIsTransitionDismissed] = useState(false);
  const [isTransitionComplete, setIsTransitionComplete] = useState(false);
  const [isForceOpen, setIsForceOpen] = useState(false);
  const [lastWeekReflections, setLastWeekReflections] = useState<Record<string, string>>({});

  /**
   * The week we are planning FOR.
   * - Mon-Sat: equals the displayed week
   * - Sun: next week's start (so the transition completed on Sunday persists into Monday)
   */
  const planningWeekStart = useMemo(() => {
    const today = new Date();
    const isSunday = today.getDay() === 0;

    // Only shift when the user is looking at the current week.
    // (ThisWeekView already guards rendering by isCurrentWeek, but keep this safe and deterministic.)
    const isViewingCurrentWeek = WeeklyProgressService.isCurrentWeek(displayedWeekStart, today);

    if (isSunday && isViewingCurrentWeek) {
      return WeeklyProgressService.addDaysToWeekStart(displayedWeekStart, 7);
    }

    return displayedWeekStart;
  }, [displayedWeekStart]);

  // Fetch consolidated dashboard data for the *planning week*.
  // The RPC returns "last week" relative to the week we pass in.
  const {
    lastWeekObjectives,
    lastWeekPost: lastWeekProgressPost,
    planningSession, // Planning session for planningWeekStart
    lastWeekPlanning, // Not currently used, kept for reference/debugging
    lastWeekStart,
    isLoading: dashboardLoading,
  } = useWeeklyDashboardData(planningWeekStart);

  // Initialize reflections from saved data (persisted on last week's progress post)
  useEffect(() => {
    const saved = lastWeekProgressPost?.incomplete_reflections as unknown;
    if (saved && typeof saved === "object") {
      setLastWeekReflections(saved as Record<string, string>);
    }
  }, [lastWeekProgressPost?.incomplete_reflections]);

  const shouldShowTransition = useMemo(() => {
    // Force open overrides all other conditions
    if (isForceOpen) return true;

    // Don't show if dismissed or already completed this session
    if (isTransitionDismissed || isTransitionComplete) return false;

    // Don't show if still loading
    if (dashboardLoading) return false;

    // Don't show if the review week is already marked complete
    if (lastWeekProgressPost?.is_completed) return false;

    // Don't show if planning for the planning week is already complete
    if (planningSession?.is_completed) return false;

    // Show if there were objectives last week (something to review)
    if (lastWeekObjectives.length > 0) return true;

    // Otherwise show only in the planning window (Sun/Mon/Tue)
    const day = new Date().getDay();
    const inPlanningWindow = day === 0 || day === 1 || day === 2;
    return inPlanningWindow;
  }, [
    isForceOpen,
    isTransitionDismissed,
    isTransitionComplete,
    dashboardLoading,
    lastWeekProgressPost?.is_completed,
    planningSession?.is_completed,
    lastWeekObjectives.length,
  ]);

  // Can re-open: has review-week objectives to revisit
  const canReopenTransition = lastWeekObjectives.length > 0;

  // Carry over mutation (targets the planning week)
  const carryOverMutation = useMutation({
    mutationFn: (objectiveIds: string[]) =>
      WeeklyProgressService.carryOverObjectives(objectiveIds, planningWeekStart),
    onSuccess: (newObjectives) => {
      queryClient.invalidateQueries({ queryKey: ["weekly-objectives", user?.id, planningWeekStart] });
      queryClient.invalidateQueries({ queryKey: ["incomplete-objectives"] });

      if (newObjectives.length > 0) {
        toast({
          title: "Objectives carried forward",
          description: `${newObjectives.length} objective(s) added to your upcoming week`,
        });
      }
    },
    onError: (error) => {
      console.error("Carry over failed:", error);
      toast({
        title: "Error",
        description: "Failed to carry over objectives",
        variant: "destructive",
      });
    },
  });

  // Complete review week mutation
  const completeLastWeekMutation = useMutation({
    mutationFn: async () => {
      await WeeklyProgressService.upsertWeeklyProgressPostWithReflections(
        lastWeekStart,
        lastWeekProgressPost?.notes || "",
        lastWeekReflections
      );
      return WeeklyProgressService.completeWeek(lastWeekStart);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-progress-post", user?.id, lastWeekStart] });
    },
    onError: (error) => {
      console.error("Complete last week failed:", error);
    },
  });

  // Save intention + complete planning session (for planning week)
  const saveIntentionMutation = useMutation({
    mutationFn: async (intention: string | null) => {
      await HabitsService.createOrUpdatePlanningSession({
        week_start: planningWeekStart,
        week_intention: intention || "",
      });
      return HabitsService.completePlanningSession(planningWeekStart);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-planning", user?.id, planningWeekStart] });
    },
    onError: (error) => {
      console.error("Save intention failed:", error);
    },
  });

  // Handlers
  const handleUpdateReflection = useCallback((objectiveId: string, reflection: string) => {
    setLastWeekReflections((prev) => ({
      ...prev,
      [objectiveId]: reflection,
    }));
  }, []);

  const handleCarryOver = useCallback(
    (objectiveIds: string[]) => {
      if (objectiveIds.length > 0) {
        carryOverMutation.mutate(objectiveIds);
      }
    },
    [carryOverMutation]
  );

  const handleSetIntention = useCallback(
    (intention: string) => {
      saveIntentionMutation.mutate(intention.trim() || null);
    },
    [saveIntentionMutation]
  );

  const handleCompleteTransition = useCallback(
    async (intention?: string) => {
      // Hide immediately
      setIsTransitionComplete(true);
      setIsForceOpen(false);

      try {
        await completeLastWeekMutation.mutateAsync();
        await saveIntentionMutation.mutateAsync(intention?.trim() ? intention.trim() : null);

        // Ensure consolidated dashboard data refreshes (for the planning week)
        queryClient.invalidateQueries({ queryKey: ["weekly-dashboard", user?.id, planningWeekStart] });

        toast({
          title: "Week transition complete! 🎉",
          description: "You're all set for the week ahead.",
        });
      } catch (error) {
        console.error("Transition completion failed:", error);
        setIsTransitionComplete(false);
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    },
    [
      completeLastWeekMutation,
      saveIntentionMutation,
      queryClient,
      user?.id,
      planningWeekStart,
    ]
  );

  const handleDismissTransition = useCallback(() => {
    setIsTransitionDismissed(true);
    setIsForceOpen(false);
  }, []);

  const handleReopenTransition = useCallback(() => {
    setIsTransitionDismissed(false);
    setIsTransitionComplete(false);
    setIsForceOpen(true);
  }, []);

  const incompleteObjectives = lastWeekObjectives.filter((obj) => !obj.is_completed);

  return {
    // Data
    lastWeekStart,
    lastWeekObjectives,
    incompleteObjectives,
    lastWeekReflections,
    planningSession,

    // State
    shouldShowTransition,
    canReopenTransition,
    isLoading: dashboardLoading,
    isCarryingOver: carryOverMutation.isPending,
    isCompleting: completeLastWeekMutation.isPending || saveIntentionMutation.isPending,

    // Handlers
    handleUpdateReflection,
    handleCarryOver,
    handleSetIntention,
    handleCompleteTransition,
    handleDismissTransition,
    handleReopenTransition,

    // Reference (not used by UI, helpful for debugging)
    lastWeekPlanning,
  };
};

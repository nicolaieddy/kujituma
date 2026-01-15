import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { HabitsService } from "@/services/habitsService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { addDays, parseISO, format } from "date-fns";

export const useWeekTransition = (currentWeekStart: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isTransitionDismissed, setIsTransitionDismissed] = useState(false);
  const [isTransitionComplete, setIsTransitionComplete] = useState(false);
  const [isForceOpen, setIsForceOpen] = useState(false);
  const [lastWeekReflections, setLastWeekReflections] = useState<Record<string, string>>({});

  // Calculate last week's start date
  const lastWeekStart = useMemo(() => {
    const currentDate = parseISO(currentWeekStart);
    const lastWeekDate = addDays(currentDate, -7);
    return format(lastWeekDate, 'yyyy-MM-dd');
  }, [currentWeekStart]);

  // Fetch last week's objectives
  const { data: lastWeekObjectives = [], isLoading: lastWeekLoading } = useQuery({
    queryKey: ['weekly-objectives', user?.id, lastWeekStart],
    queryFn: () => WeeklyProgressService.getWeeklyObjectives(lastWeekStart),
    enabled: !!user && !!lastWeekStart,
  });

  // Fetch last week's progress post (to check if completed and get saved reflections)
  const { data: lastWeekProgressPost, isLoading: lastWeekProgressLoading } = useQuery({
    queryKey: ['weekly-progress-post', user?.id, lastWeekStart],
    queryFn: () => WeeklyProgressService.getWeeklyProgressPost(lastWeekStart),
    enabled: !!user && !!lastWeekStart,
  });

  // Fetch current week's planning session
  const { data: planningSession, isLoading: planningLoading } = useQuery({
    queryKey: ['weekly-planning', user?.id, currentWeekStart],
    queryFn: () => HabitsService.getWeeklyPlanningSession(currentWeekStart),
    enabled: !!user && !!currentWeekStart,
  });

  // Check if we should show transition
  const shouldShowTransition = useMemo(() => {
    // Force open overrides all other conditions
    if (isForceOpen) return true;
    
    // Don't show if dismissed or already completed this session
    if (isTransitionDismissed || isTransitionComplete) return false;
    
    // Don't show if still loading
    if (lastWeekLoading || lastWeekProgressLoading || planningLoading) return false;
    
    // Don't show if last week was already marked complete
    if (lastWeekProgressPost?.is_completed) return false;
    
    // Don't show if planning for current week is already complete
    if (planningSession?.is_completed) return false;
    
    // Show if there were objectives last week (something to review)
    if (lastWeekObjectives.length > 0) return true;
    
    // Show if it's early in the week (Monday or Tuesday) and planning not done
    const today = new Date();
    const dayOfWeek = today.getDay();
    const isEarlyWeek = dayOfWeek === 1 || dayOfWeek === 2; // Monday or Tuesday
    
    return isEarlyWeek && !planningSession?.is_completed;
  }, [
    isForceOpen,
    isTransitionDismissed,
    isTransitionComplete,
    lastWeekLoading,
    lastWeekProgressLoading,
    planningLoading,
    lastWeekProgressPost?.is_completed,
    planningSession?.is_completed,
    lastWeekObjectives.length,
  ]);

  // Can re-open: has last week objectives to review
  const canReopenTransition = lastWeekObjectives.length > 0;

  // Initialize reflections from saved data
  useMemo(() => {
    if (lastWeekProgressPost?.incomplete_reflections) {
      const saved = lastWeekProgressPost.incomplete_reflections as Record<string, string>;
      if (typeof saved === 'object' && saved !== null) {
        setLastWeekReflections(saved);
      }
    }
  }, [lastWeekProgressPost?.incomplete_reflections]);

  // Carry over mutation
  const carryOverMutation = useMutation({
    mutationFn: (objectiveIds: string[]) => 
      WeeklyProgressService.carryOverObjectives(objectiveIds, currentWeekStart),
    onSuccess: (newObjectives) => {
      queryClient.invalidateQueries({ queryKey: ['weekly-objectives', user?.id, currentWeekStart] });
      queryClient.invalidateQueries({ queryKey: ['incomplete-objectives'] });
      if (newObjectives.length > 0) {
        toast({
          title: "Objectives carried forward",
          description: `${newObjectives.length} objective(s) added to this week`,
        });
      }
    },
    onError: (error) => {
      console.error('Carry over failed:', error);
      toast({
        title: "Error",
        description: "Failed to carry over objectives",
        variant: "destructive",
      });
    },
  });

  // Complete last week mutation
  const completeLastWeekMutation = useMutation({
    mutationFn: async () => {
      // Save reflections to last week's progress post
      await WeeklyProgressService.upsertWeeklyProgressPostWithReflections(
        lastWeekStart,
        lastWeekProgressPost?.notes || '',
        lastWeekReflections
      );
      // Mark last week as complete
      return WeeklyProgressService.completeWeek(lastWeekStart);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-progress-post', user?.id, lastWeekStart] });
    },
    onError: (error) => {
      console.error('Complete last week failed:', error);
    },
  });

  // Save intention mutation
  const saveIntentionMutation = useMutation({
    mutationFn: async (intention: string | null) => {
      // Save the intention (even if empty, just to create the session)
      await HabitsService.createOrUpdatePlanningSession({
        week_start: currentWeekStart,
        week_intention: intention || '',
      });
      // Always complete the planning session
      return HabitsService.completePlanningSession(currentWeekStart);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-planning', user?.id, currentWeekStart] });
    },
    onError: (error) => {
      console.error('Save intention failed:', error);
    },
  });

  // Handlers
  const handleUpdateReflection = useCallback((objectiveId: string, reflection: string) => {
    setLastWeekReflections(prev => ({
      ...prev,
      [objectiveId]: reflection,
    }));
  }, []);

  const handleCarryOver = useCallback((objectiveIds: string[]) => {
    if (objectiveIds.length > 0) {
      carryOverMutation.mutate(objectiveIds);
    }
  }, [carryOverMutation]);

  const handleSetIntention = useCallback((intention: string) => {
    if (intention.trim()) {
      saveIntentionMutation.mutate(intention);
    }
  }, [saveIntentionMutation]);

  const handleCompleteTransition = useCallback(async (intention?: string) => {
    // Set complete state FIRST to immediately hide the card
    setIsTransitionComplete(true);
    setIsForceOpen(false);
    
    try {
      // Complete last week
      await completeLastWeekMutation.mutateAsync();
      
      // Always complete current week's planning session (even if no intention)
      await saveIntentionMutation.mutateAsync(intention || null);
      
      toast({
        title: "Week transition complete! 🎉",
        description: "You're all set for a great week ahead.",
      });
    } catch (error) {
      console.error('Transition completion failed:', error);
      // Revert on error so user can try again
      setIsTransitionComplete(false);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  }, [completeLastWeekMutation, saveIntentionMutation]);

  const handleDismissTransition = useCallback(() => {
    setIsTransitionDismissed(true);
    setIsForceOpen(false);
  }, []);

  const handleReopenTransition = useCallback(() => {
    setIsTransitionDismissed(false);
    setIsTransitionComplete(false);
    setIsForceOpen(true);
  }, []);

  const incompleteObjectives = lastWeekObjectives.filter(obj => !obj.is_completed);

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
    isLoading: lastWeekLoading || lastWeekProgressLoading || planningLoading,
    isCarryingOver: carryOverMutation.isPending,
    isCompleting: completeLastWeekMutation.isPending || saveIntentionMutation.isPending,
    
    // Handlers
    handleUpdateReflection,
    handleCarryOver,
    handleSetIntention,
    handleCompleteTransition,
    handleDismissTransition,
    handleReopenTransition,
  };
};

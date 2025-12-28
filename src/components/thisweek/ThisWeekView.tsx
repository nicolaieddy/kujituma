import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { useGoals } from "@/hooks/useGoals";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { HabitsService } from "@/services/habitsService";
import { WeeklyObjectivesList } from "@/components/goals/WeeklyObjectivesList";
import { WeekHeader } from "@/components/thisweek/WeekHeader";
import { WeeklyReflectionCard } from "@/components/thisweek/WeeklyReflectionCard";
import { ShareWeekCard } from "@/components/thisweek/ShareWeekCard";
import { ThisWeekSkeleton } from "@/components/thisweek/ThisWeekSkeleton";
import { ShareConfirmationDialog } from "@/components/thisweek/ShareConfirmationDialog";
import { HabitsDueThisWeek } from "@/components/thisweek/HabitsDueThisWeek";
import { HabitDetailModal } from "@/components/habits/HabitDetailModal";
import { useHabitStats } from "@/hooks/useHabitStats";
import { HabitStats } from "@/services/habitStreaksService";
import { EndOfWeekReflection } from "@/components/habits/EndOfWeekReflection";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { useWeeklyInsights } from "@/hooks/useWeeklyInsights";
import { useAllWeeklyObjectives } from "@/hooks/useAllWeeklyObjectives";
import { AISuggestionsCard } from "@/components/goals/AISuggestionsCard";

interface ThisWeekViewProps {
  weekStart?: string;
  onNavigateWeek?: (direction: 'previous' | 'next') => void;
}

export const ThisWeekView = ({ weekStart, onNavigateWeek }: ThisWeekViewProps) => {
  const { user } = useAuth();
  const { goals, isCached: goalsCached } = useGoals();
  const { habitStats, refetch: refetchHabits } = useHabitStats();
  const { lastSync, isOffline } = useOfflineStatus();
  const queryClient = useQueryClient();
  const [isSharing, setIsSharing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showShareConfirmation, setShowShareConfirmation] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<HabitStats | null>(null);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false);
  
  // Track mounted state to prevent state updates after unmount
  const mountedRef = useRef(true);

  // Reset mounted ref on mount/unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  const {
    objectives,
    progressPost,
    feedPost,
    createObjective,
    updateObjective,
    deleteObjective,
    deleteAllObjectives,
    updateProgressNotes,
    weekRange,
    weekNumber,
    weekStart: currentWeekStart,
    isDeletingAll,
    isLoading: weeklyDataLoading,
  } = useWeeklyProgress(weekStart);

  // Get all objectives for suggestions
  const { objectives: allObjectives } = useAllWeeklyObjectives();
  
  // AI Suggestions
  const { suggestions, isSuggestionsLoading, generateSuggestions, clearSuggestions, cleanup: cleanupInsights } = useWeeklyInsights();

  // Cleanup insights on unmount
  useEffect(() => {
    return () => {
      cleanupInsights();
    };
  }, [cleanupInsights]);

  // Generate suggestions when on current week with few objectives
  const isCurrentWeek = WeeklyProgressService.isCurrentWeek(currentWeekStart);
  const isWeekCompleted = progressPost?.is_completed || false;
  
  useEffect(() => {
    // Don't run if already fetched or component unmounted
    if (hasFetchedSuggestions || !mountedRef.current) return;
    
    // Check conditions
    if (
      !isCurrentWeek || 
      isWeekCompleted || 
      weeklyDataLoading ||
      !goals || 
      goals.length === 0 ||
      (objectives?.length || 0) >= 3
    ) {
      return;
    }

    // Set fetched immediately to prevent re-runs
    setHasFetchedSuggestions(true);
    
    // Get incomplete objectives from previous weeks
    const incompleteFromPast = (allObjectives || [])
      .filter(o => !o.is_completed && o.week_start !== currentWeekStart)
      .map(o => ({ text: o.text, weekStart: o.week_start }));
    
    // Get completed objectives for context
    const completedRecently = (allObjectives || [])
      .filter(o => o.is_completed)
      .slice(0, 10)
      .map(o => ({ text: o.text }));
    
    generateSuggestions({
      incompleteObjectives: incompleteFromPast,
      completedObjectives: completedRecently,
      goals: (goals || []).filter(g => g.status === 'in_progress' || g.status === 'not_started')
        .map(g => ({ title: g.title, description: g.description || undefined })),
    }).catch(err => {
      // Only log if still mounted
      if (mountedRef.current) {
        console.error('[ThisWeekView] Failed to generate suggestions:', err);
      }
    });
  }, [isCurrentWeek, isWeekCompleted, hasFetchedSuggestions, weeklyDataLoading, goals, objectives, allObjectives, currentWeekStart, generateSuggestions]);

  // Reset when week changes
  useEffect(() => {
    if (mountedRef.current) {
      setHasFetchedSuggestions(false);
    }
    clearSuggestions();
  }, [currentWeekStart, clearSuggestions]);

  // Simple week navigation (no blocking needed - auto-save handles data)
  const handleNavigateWeek = useCallback((direction: 'previous' | 'next') => {
    if (onNavigateWeek) {
      onNavigateWeek(direction);
    }
  }, [onNavigateWeek]);

  const handleAddSuggestion = async (text: string) => {
    try {
      await createObjective({
        text,
        week_start: currentWeekStart,
        goal_id: null,
      });
    } catch (err) {
      console.error('[ThisWeekView] Failed to add suggestion:', err);
    }
  };

  const handleRefreshSuggestions = () => {
    try {
      const incompleteFromPast = (allObjectives || [])
        .filter(o => !o.is_completed && o.week_start !== currentWeekStart)
        .map(o => ({ text: o.text, weekStart: o.week_start }));
      
      const completedRecently = (allObjectives || [])
        .filter(o => o.is_completed)
        .slice(0, 10)
        .map(o => ({ text: o.text }));
      
      generateSuggestions({
        incompleteObjectives: incompleteFromPast,
        completedObjectives: completedRecently,
        goals: (goals || []).filter(g => g.status === 'in_progress' || g.status === 'not_started')
          .map(g => ({ title: g.title, description: g.description || undefined })),
      }).catch(err => console.error('[ThisWeekView] Failed to refresh suggestions:', err));
    } catch (err) {
      console.error('[ThisWeekView] Error refreshing suggestions:', err);
    }
  };

  const handleUpdateObjectiveGoal = (id: string, goalId: string | null) => {
    updateObjective(id, { goal_id: goalId });
  };

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

  const handleToggleObjective = (id: string, isCompleted: boolean) => {
    updateObjective(id, { is_completed: !isCompleted });
  };

  const handleUpdateObjectiveText = (id: string, text: string) => {
    updateObjective(id, { text });
  };

  const handleDeleteObjective = (id: string) => {
    deleteObjective(id);
  };

  const handleReorderObjective = async (objectiveId: string, newOrderIndex: number) => {
    try {
      await updateObjective(objectiveId, { order_index: newOrderIndex });
    } catch (error) {
      console.error('Error reordering objective:', error);
    }
  };

  const handleUpdateObjectiveSchedule = (id: string, day: string | null, time: string | null) => {
    updateObjective(id, { scheduled_day: day, scheduled_time: time });
  };

  const handleMoveObjectiveToWeek = async (objectiveId: string, newWeekStart: string, scheduledDay: string) => {
    try {
      // Find the objective to get its text for the reflection
      const objective = objectives?.find(obj => obj.id === objectiveId);
      
      // First, create a copy of the objective in the new week
      if (objective) {
        await WeeklyProgressService.createWeeklyObjective({
          text: objective.text,
          goal_id: objective.goal_id || undefined,
          week_start: newWeekStart,
          scheduled_day: scheduledDay,
          scheduled_time: objective.scheduled_time,
        });
      }
      
      // Then mark the original as "moved" by storing in incomplete reflections
      const movedReflection = `[MOVED] Rescheduled to week of ${newWeekStart}`;
      await WeeklyProgressService.upsertWeeklyProgressPostWithReflections(
        currentWeekStart,
        progressPost?.notes || '',
        { ...incompleteReflections, [objectiveId]: movedReflection }
      );
      
      // Delete the original objective from the current week
      await deleteObjective(objectiveId);
      
      // Invalidate queries
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
  };

  // State for incomplete reflections - safely parse from progressPost
  const safeIncompleteReflections = (): Record<string, string> => {
    try {
      const raw = progressPost?.incomplete_reflections;
      if (!raw) return {};
      if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
        return raw as Record<string, string>;
      }
      return {};
    } catch {
      return {};
    }
  };
  
  const [incompleteReflections, setIncompleteReflections] = useState<Record<string, string>>(
    safeIncompleteReflections
  );

  // Sync state when progressPost changes
  useEffect(() => {
    setIncompleteReflections(safeIncompleteReflections());
  }, [progressPost?.incomplete_reflections]);

  const handleUpdateIncompleteReflection = useCallback((objectiveId: string, reflection: string) => {
    setIncompleteReflections(prev => ({
      ...prev,
      [objectiveId]: reflection
    }));
    // Auto-save the reflections
    WeeklyProgressService.upsertWeeklyProgressPostWithReflections(
      currentWeekStart,
      progressPost?.notes || '',
      { ...incompleteReflections, [objectiveId]: reflection }
    ).catch(err => console.error('[ThisWeekView] Failed to save reflections:', err));
  }, [currentWeekStart, progressPost?.notes, incompleteReflections]);

  const isEndOfWeek = HabitsService.isEndOfWeek();

  const handleViewInCommunity = () => {
    if (feedPost) {
      window.open(`/community?post=${feedPost.id}`, '_blank');
    } else {
      window.open('/community', '_blank');
    }
  };

  const handleRequestShare = () => {
    setShowShareConfirmation(true);
  };

  const handleConfirmShare = async () => {
    if (!user) return;
    
    setShowShareConfirmation(false);
    setIsSharing(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const latestProgressPost = await WeeklyProgressService.getWeeklyProgressPost(currentWeekStart);

      const completedObjectives = objectives?.filter(obj => obj.is_completed) || [];
      const pendingObjectives = objectives?.filter(obj => !obj.is_completed) || [];
      
      let accomplishments = '';
      
      if (completedObjectives.length > 0 || pendingObjectives.length > 0) {
        accomplishments += '🎯 This Week\'s Progress:\n\n';
        
        if (completedObjectives.length > 0) {
          accomplishments += 'Completed Objectives:\n';
          accomplishments += completedObjectives.map(obj => `• ${obj.text}`).join('\n');
          accomplishments += '\n\n';
        }
        
        if (pendingObjectives.length > 0) {
          accomplishments += 'Incomplete Objectives:\n';
          accomplishments += pendingObjectives.map(obj => `• ${obj.text}`).join('\n');
          accomplishments += '\n\n';
          
          // Safely get incomplete reflections
          let reflectionsObj: Record<string, string> = {};
          try {
            const raw = latestProgressPost?.incomplete_reflections;
            if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
              reflectionsObj = raw as Record<string, string>;
            }
          } catch {
            reflectionsObj = {};
          }
          
          const reflectionEntries = Object.entries(reflectionsObj)
            .filter(([_, reflection]) => reflection && typeof reflection === 'string' && reflection.trim())
            .map(([_, reflection]) => reflection);
          
          if (reflectionEntries.length > 0) {
            accomplishments += 'Reflections on Incomplete Objectives:\n';
            accomplishments += reflectionEntries.join('\n');
            accomplishments += '\n\n';
          }
        }
      }
      
      const weeklyReflection = latestProgressPost?.notes?.trim() || '';
      
      if (!accomplishments.trim()) {
        accomplishments = 'Focused on personal growth this week.';
      }

      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const completedCount = completedObjectives.length;
      const totalCount = objectives?.length || 0;
      const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          name: profile?.full_name || 'Anonymous',
          accomplishments: accomplishments,
          priorities: '',
          help: '',
          reflection: weeklyReflection,
          week_start: currentWeekStart,
          week_end: weekEnd.toISOString().split('T')[0],
          objectives_completed: completedCount,
          total_objectives: totalCount,
          completion_percentage: completionPercentage,
        });

      if (error) {
        console.error('Error sharing week:', error);
        toast({
          title: "Error",
          description: "Failed to share your week. Please try again.",
          variant: "destructive",
        });
      } else {
        await WeeklyProgressService.completeWeek(currentWeekStart);
        
        toast({
          title: "Success",
          description: "Your weekly progress has been shared with the community! This week is now locked.",
        });
        
        await queryClient.invalidateQueries({ queryKey: ['week-feed-post'] });
        await queryClient.invalidateQueries({ queryKey: ['weekly-progress-post'] });
        await queryClient.refetchQueries({ queryKey: ['weekly-progress-post', user.id, currentWeekStart] });
      }
    } catch (error) {
      console.error('Error sharing week:', error);
      toast({
        title: "Error",
        description: "Failed to share your week. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const completedCount = objectives?.filter(obj => obj.is_completed).length || 0;
  const totalCount = objectives?.length || 0;
  const hasShared = !!feedPost;
  
  // Enforce immutability: once a week is completed (shared), it becomes read-only
  const isReadOnly = isWeekCompleted;

  const handleHabitClick = (habit: HabitStats) => {
    setSelectedHabit(habit);
    setShowHabitModal(true);
  };

  const handleCloseHabitModal = () => {
    setShowHabitModal(false);
    setSelectedHabit(null);
  };

  // Show loading skeleton while data is being fetched
  if (weeklyDataLoading) {
    return <ThisWeekSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Week Header */}
      <WeekHeader
        weekNumber={weekNumber}
        weekRange={weekRange}
        currentWeekStart={currentWeekStart}
        completedCount={completedCount}
        totalCount={totalCount}
        onNavigateWeek={handleNavigateWeek}
        isCached={goalsCached || isOffline}
        lastSync={lastSync}
      />

      {/* Habits Due This Week */}
      {isCurrentWeek && habitStats.length > 0 && (
        <HabitsDueThisWeek
          habits={habitStats}
          objectives={objectives || []}
          onHabitClick={handleHabitClick}
          onToggleObjective={handleToggleObjective}
        />
      )}

      {/* AI Suggestions - Show when on current week with few objectives */}
      {isCurrentWeek && !isReadOnly && (suggestions.length > 0 || isSuggestionsLoading) && (
        <AISuggestionsCard
          suggestions={suggestions}
          isLoading={isSuggestionsLoading}
          onAddSuggestion={handleAddSuggestion}
          onRefresh={handleRefreshSuggestions}
        />
      )}

      {/* Weekly Objectives */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">This Week's Focus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <WeeklyObjectivesList
            objectives={objectives || []}
            goals={goals || []}
            isWeekCompleted={isReadOnly}
            isCreating={isCreating}
            onToggleObjective={handleToggleObjective}
            onUpdateObjectiveText={handleUpdateObjectiveText}
            onUpdateObjectiveGoal={handleUpdateObjectiveGoal}
            onDeleteObjective={handleDeleteObjective}
            onDeleteAllObjectives={deleteAllObjectives}
            onAddObjective={handleAddObjective}
            isDeletingAll={isDeletingAll}
            onReorderObjective={handleReorderObjective}
            onUpdateObjectiveSchedule={handleUpdateObjectiveSchedule}
            currentWeekStart={currentWeekStart}
            onMoveObjectiveToWeek={handleMoveObjectiveToWeek}
            
          />
        </CardContent>
      </Card>

      {/* End of Week Reflection - show on Fri/Sat if there are incomplete objectives */}
      {isEndOfWeek && isCurrentWeek && !isReadOnly && objectives && objectives.some(obj => !obj.is_completed) && (
        <EndOfWeekReflection
          objectives={objectives}
          incompleteReflections={incompleteReflections}
          onUpdateReflection={handleUpdateIncompleteReflection}
          isReadOnly={isReadOnly}
        />
      )}

      {/* Weekly Reflection */}
      <WeeklyReflectionCard
        initialNotes={progressPost?.notes || ""}
        onUpdateNotes={updateProgressNotes}
        isReadOnly={isReadOnly}
        weekStart={currentWeekStart}
      />

      {/* Share Week */}
      <ShareWeekCard
        hasShared={hasShared}
        isCurrentWeek={isCurrentWeek}
        isSharing={isSharing}
        feedPost={feedPost}
        objectives={objectives || []}
        reflectionValue={progressPost?.notes || ""}
        onShareWeek={handleRequestShare}
        onViewInCommunity={handleViewInCommunity}
        isWeekCompleted={isWeekCompleted}
      />

      {/* Confirmation Dialog */}
      <ShareConfirmationDialog
        isOpen={showShareConfirmation}
        onClose={() => setShowShareConfirmation(false)}
        onConfirm={handleConfirmShare}
        isSharing={isSharing}
      />

      {/* Habit Detail Modal */}
      <HabitDetailModal
        habitStats={selectedHabit}
        isOpen={showHabitModal}
        onClose={handleCloseHabitModal}
        onUpdate={refetchHabits}
      />

    </div>
  );
};

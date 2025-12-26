import { useState, useCallback } from "react";
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

interface ThisWeekViewProps {
  weekStart?: string;
  onNavigateWeek?: (direction: 'previous' | 'next') => void;
}

export const ThisWeekView = ({ weekStart, onNavigateWeek }: ThisWeekViewProps) => {
  const { user } = useAuth();
  const { goals } = useGoals();
  const { habitStats, refetch: refetchHabits } = useHabitStats();
  const queryClient = useQueryClient();
  const [isSharing, setIsSharing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showShareConfirmation, setShowShareConfirmation] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<HabitStats | null>(null);
  const [showHabitModal, setShowHabitModal] = useState(false);
  
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

  // State for incomplete reflections
  const [incompleteReflections, setIncompleteReflections] = useState<Record<string, string>>(
    progressPost?.incomplete_reflections || {}
  );

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
    );
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
          
          const incompleteReflections = latestProgressPost?.incomplete_reflections || {};
          const reflectionEntries = Object.entries(incompleteReflections)
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
  const isCurrentWeek = WeeklyProgressService.isCurrentWeek(currentWeekStart);
  
  // Enforce immutability: once a week is completed (shared), it becomes read-only
  const isWeekCompleted = progressPost?.is_completed || false;
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
        onNavigateWeek={onNavigateWeek}
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

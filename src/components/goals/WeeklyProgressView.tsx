
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { useGoals } from "@/hooks/useGoals";
import { useCarryOverObjectives } from "@/hooks/useCarryOverObjectives";
import { PreviousWeekSummary } from "./PreviousWeekSummary";
import { WeeklyProgressHeader } from "./WeeklyProgressHeader";
import { WeeklyObjectivesList } from "./WeeklyObjectivesList";
import { WeeklyProgressNotesSection } from "./WeeklyProgressNotesSection";
import { WeeklyProgressActions } from "./WeeklyProgressActions";
import { IncompleteObjectivesModal } from "./IncompleteObjectivesModal";
import { CarryOverObjectivesModal } from "./CarryOverObjectivesModal";
import { IncompleteObjectiveReflections } from "./IncompleteObjectiveReflections";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export const WeeklyProgressView = () => {
  const { user } = useAuth();
  const { goals } = useGoals();
  const queryClient = useQueryClient();
  const [progressNotes, setProgressNotes] = useState("");
  const [isPostingToFeed, setIsPostingToFeed] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showCarryOverModal, setShowCarryOverModal] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(
    WeeklyProgressService.getWeekStart()
  );
  
  const {
    objectives,
    progressPost,
    feedPost,
    createObjective,
    updateObjective,
    deleteObjective,
    deleteAllObjectives,
    updateProgressNotes,
    completeWeek,
    uncompleteWeek,
    weekStart,
    weekRange,
    weekNumber,
    isCreating,
    isSavingNotes,
    isCompletingWeek,
    isUncompletingWeek,
    isDeletingAll,
  } = useWeeklyProgress(currentWeekStart);

  // Carry-over functionality
  const {
    incompleteObjectives,
    carryOverObjectives,
    isCarryingOver,
  } = useCarryOverObjectives(currentWeekStart);

  // Initialize progress notes when progressPost changes
  useEffect(() => {
    setProgressNotes(progressPost?.notes || "");
  }, [progressPost]);

  const handlePreviousWeek = () => {
    const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
    currentDate.setUTCDate(currentDate.getUTCDate() - 7);
    const newWeekStart = WeeklyProgressService.getWeekStart(currentDate);
    setCurrentWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
    currentDate.setUTCDate(currentDate.getUTCDate() + 7);
    const newWeekStart = WeeklyProgressService.getWeekStart(currentDate);
    setCurrentWeekStart(newWeekStart);
  };

  const handleAddObjective = async (text: string, goalId?: string) => {
    await createObjective({
      text,
      goal_id: goalId,
      week_start: currentWeekStart,
    });
  };

  const handleUpdateObjectiveGoal = (id: string, goalId: string | null) => {
    updateObjective(id, { goal_id: goalId });
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

  const handleMoveObjectiveToWeek = async (objectiveId: string, newWeekStart: string) => {
    try {
      await updateObjective(objectiveId, { week_start: newWeekStart });
      toast({
        title: "Objective moved",
        description: "The objective has been moved to a different week.",
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

  const handleSaveNotes = () => {
    updateProgressNotes(progressNotes);
  };

  const handleCompleteWeek = () => {
    completeWeek();
  };

  const handlePostToFeed = () => {
    const incompleteObjectives = objectives?.filter(obj => !obj.is_completed) || [];
    
    if (incompleteObjectives.length > 0) {
      setShowIncompleteModal(true);
    } else {
      performPostToFeed();
    }
  };

  const performPostToFeed = async (incompleteReflections?: Record<string, string>) => {
    setIsPostingToFeed(true);
    
    try {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to post to feed",
          variant: "destructive",
        });
        return;
      }

      // First save the reflections to the progress post if provided
      if (incompleteReflections && Object.keys(incompleteReflections).length > 0) {
        await WeeklyProgressService.upsertWeeklyProgressPostWithReflections(
          currentWeekStart, 
          progressNotes, 
          incompleteReflections
        );
        // Invalidate queries to get the updated data
        queryClient.invalidateQueries({ queryKey: ['weekly-progress-post'] });
      }

      // Complete the week directly using the service
      await WeeklyProgressService.completeWeek(currentWeekStart);
      
      // Invalidate queries to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['weekly-progress-post'] });

      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Calculate week end date
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Create detailed accomplishments with completed objectives
      console.log('Objectives for feed post:', objectives);
      const completedObjectives = objectives?.filter(obj => obj.is_completed) || [];
      const pendingObjectives = objectives?.filter(obj => !obj.is_completed) || [];
      
      console.log('Completed objectives:', completedObjectives);
      console.log('Pending objectives:', pendingObjectives);
      
      let accomplishments = '';
      
      // Always show objectives summary if there are any objectives
      if (completedObjectives.length > 0 || pendingObjectives.length > 0) {
        accomplishments += '🎯 This Week\'s Objectives:\n\n';
        
        if (completedObjectives.length > 0) {
          accomplishments += '✅ Completed Objectives:\n';
          accomplishments += completedObjectives.map(obj => `• ${obj.text}`).join('\n');
          accomplishments += '\n\n';
        }
        
        if (pendingObjectives.length > 0) {
          accomplishments += '❌ Incomplete Objectives:\n';
          accomplishments += pendingObjectives.map(obj => `• ${obj.text}`).join('\n');
          accomplishments += '\n\n';
          
          // Add reflections for incomplete objectives if provided
          if (incompleteReflections && Object.keys(incompleteReflections).length > 0) {
            accomplishments += '🤔 Reflections on Incomplete Objectives:\n';
            pendingObjectives.forEach(obj => {
              if (incompleteReflections[obj.id]?.trim()) {
                accomplishments += `• **${obj.text}**: ${incompleteReflections[obj.id]}\n`;
              }
            });
            accomplishments += '\n';
          }
        }
      }
      
      // Add weekly reflections/notes
      if (progressPost?.notes?.trim()) {
        accomplishments += '📝 Weekly Reflections:\n';
        accomplishments += progressPost.notes;
        accomplishments += '\n\n';
      }

      // Only use fallback if there are truly no objectives AND no notes
      if (accomplishments.trim() === '' && (completedObjectives.length === 0 && pendingObjectives.length === 0 && !progressPost?.notes?.trim())) {
        accomplishments = 'No objectives or reflections recorded for this week.';
      }

      let priorities = '';
      if (pendingObjectives.length > 0) {
        priorities = 'Remaining objectives for next week:\n';
        priorities += pendingObjectives.map(obj => `• ${obj.text}`).join('\n');
      }

      // Create the feed post
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          name: profile?.full_name || 'Anonymous',
          accomplishments: accomplishments || 'No specific accomplishments recorded.',
          priorities: priorities,
          help: '', // Could be enhanced to extract help requests from notes
          week_start: currentWeekStart,
          week_end: weekEnd.toISOString().split('T')[0],
          objectives_completed: completedCount,
          total_objectives: totalCount,
          completion_percentage: completionPercentage,
        });

      if (error) {
        console.error('Error creating feed post:', error);
        toast({
          title: "Error",
          description: "Failed to post to feed. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Your weekly progress has been posted to the feed!",
        });
      }
    } catch (error) {
      console.error('Error posting to feed:', error);
      toast({
        title: "Error",
        description: "Failed to post to feed. Please try again.",
        variant: "destructive",
      });
      } finally {
        setIsPostingToFeed(false);
        setShowIncompleteModal(false);
        // Invalidate feed post query to check if it's now posted
        queryClient.invalidateQueries({ queryKey: ['week-feed-post'] });
      }
  };

  const handleConfirmPostWithReflections = (reflections: Record<string, string>) => {
    performPostToFeed(reflections);
  };

  const handleEditWeek = () => {
    console.log('Editing week:', weekStart);
    uncompleteWeek();
  };

  const handleViewPost = () => {
    if (feedPost) {
      // Navigate to feed with the specific post - you could implement a route like /feed#post-id
      // For now, just navigate to feed
      window.open('/feed', '_blank');
    }
  };

  const handleOpenCarryOver = () => {
    setShowCarryOverModal(true);
  };

  const handleCarryOverObjectives = (objectiveIds: string[]) => {
    carryOverObjectives(objectiveIds);
    setShowCarryOverModal(false);
  };

  const completedCount = objectives?.filter(obj => obj.is_completed).length || 0;
  const totalCount = objectives?.length || 0;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isWeekCompleted = progressPost?.is_completed || false;

  // Don't render if essential data is still loading
  if (!objectives || !goals) {
    return (
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="p-6">
          <div className="text-center text-white">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
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
          <PreviousWeekSummary currentWeekStart={currentWeekStart} />

          <WeeklyObjectivesList
            objectives={objectives}
            goals={goals}
            isWeekCompleted={isWeekCompleted}
            isCreating={isCreating}
            onToggleObjective={handleToggleObjective}
            onUpdateObjectiveText={handleUpdateObjectiveText}
            onUpdateObjectiveGoal={handleUpdateObjectiveGoal}
            onDeleteObjective={handleDeleteObjective}
            onDeleteAllObjectives={deleteAllObjectives}
            onAddObjective={handleAddObjective}
            onOpenCarryOver={handleOpenCarryOver}
            hasIncompleteObjectives={incompleteObjectives.length > 0}
            isDeletingAll={isDeletingAll}
            currentWeekStart={currentWeekStart}
            onMoveObjectiveToWeek={handleMoveObjectiveToWeek}
          />

          <IncompleteObjectiveReflections
            objectives={objectives}
            progressPost={progressPost}
          />

          <WeeklyProgressNotesSection
            progressNotes={progressNotes}
            isWeekCompleted={isWeekCompleted}
            onNotesChange={setProgressNotes}
          />

          <WeeklyProgressActions
            isWeekCompleted={isWeekCompleted}
            weekNumber={weekNumber}
            feedPost={feedPost}
            isSavingNotes={isSavingNotes}
            isCompletingWeek={isPostingToFeed}
            isUncompletingWeek={isUncompletingWeek}
            onSaveNotes={handleSaveNotes}
            onPostToFeed={handlePostToFeed}
            onEditWeek={handleEditWeek}
            onViewPost={handleViewPost}
          />
        </CardContent>
      </Card>

      <IncompleteObjectivesModal
        open={showIncompleteModal}
        onOpenChange={setShowIncompleteModal}
        incompleteObjectives={objectives?.filter(obj => !obj.is_completed) || []}
        onConfirmPost={handleConfirmPostWithReflections}
        isPosting={isPostingToFeed}
      />

      <CarryOverObjectivesModal
        open={showCarryOverModal}
        onOpenChange={setShowCarryOverModal}
        incompleteObjectives={incompleteObjectives}
        goals={goals || []}
        onConfirmCarryOver={handleCarryOverObjectives}
        isCarryingOver={isCarryingOver}
      />
    </>
  );
};

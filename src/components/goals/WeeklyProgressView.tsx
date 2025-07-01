
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { useGoals } from "@/hooks/useGoals";
import { PreviousWeekSummary } from "./PreviousWeekSummary";
import { WeeklyProgressHeader } from "./WeeklyProgressHeader";
import { WeeklyObjectivesList } from "./WeeklyObjectivesList";
import { WeeklyProgressNotesSection } from "./WeeklyProgressNotesSection";
import { WeeklyProgressActions } from "./WeeklyProgressActions";
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
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(
    WeeklyProgressService.getWeekStart()
  );
  
  const {
    objectives,
    progressPost,
    createObjective,
    updateObjective,
    deleteObjective,
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
  } = useWeeklyProgress(currentWeekStart);

  // Debug auth state
  useEffect(() => {
    console.log('WeeklyProgressView - Current week start:', currentWeekStart);
    console.log('WeeklyProgressView - Objectives count:', objectives?.length || 0);
    console.log('WeeklyProgressView - Progress post:', progressPost ? 'exists' : 'null');
  }, [currentWeekStart, objectives, progressPost]);

  // Initialize progress notes when progressPost changes
  useEffect(() => {
    console.log('Progress post changed:', progressPost);
    setProgressNotes(progressPost?.notes || "");
  }, [progressPost]);

  const handlePreviousWeek = () => {
    console.log('Previous week button clicked!');
    const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
    // Subtract exactly 7 days to move to previous week
    currentDate.setUTCDate(currentDate.getUTCDate() - 7);
    const newWeekStart = WeeklyProgressService.getWeekStart(currentDate);
    console.log('Previous week navigation:', currentWeekStart, '->', newWeekStart);
    setCurrentWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    console.log('Next week button clicked!');
    const currentDate = new Date(currentWeekStart + 'T00:00:00.000Z');
    // Add exactly 7 days to move to next week
    currentDate.setUTCDate(currentDate.getUTCDate() + 7);
    const newWeekStart = WeeklyProgressService.getWeekStart(currentDate);
    console.log('Next week navigation:', currentWeekStart, '->', newWeekStart);
    setCurrentWeekStart(newWeekStart);
  };

  const handleAddObjective = (text: string, goalId?: string) => {
    console.log('Adding objective:', text, 'with goal:', goalId);
    createObjective({
      text,
      goal_id: goalId,
      week_start: currentWeekStart,
    });
  };

  const handleToggleObjective = (id: string, isCompleted: boolean) => {
    console.log('Toggling objective:', id, 'to', !isCompleted);
    updateObjective(id, { is_completed: !isCompleted });
  };

  const handleUpdateObjectiveText = (id: string, text: string) => {
    console.log('Updating objective text:', id, text);
    updateObjective(id, { text });
  };

  const handleDeleteObjective = (id: string) => {
    console.log('Deleting objective:', id);
    deleteObjective(id);
  };

  const handleSaveNotes = () => {
    console.log('Saving notes:', progressNotes);
    updateProgressNotes(progressNotes);
  };

  const handleCompleteWeek = () => {
    console.log('Completing week:', weekStart);
    completeWeek();
  };

  const handlePostToFeed = async () => {
    console.log('Posting week to feed:', weekStart);
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

      // First complete the week directly using the service
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
      if (completedObjectives.length > 0) {
        accomplishments += '✅ Completed Objectives:\n';
        accomplishments += completedObjectives.map(obj => `• ${obj.text}`).join('\n');
        accomplishments += '\n\n';
      }
      
      if (pendingObjectives.length > 0) {
        accomplishments += '❌ Incomplete Objectives:\n';
        accomplishments += pendingObjectives.map(obj => `• ${obj.text}`).join('\n');
        accomplishments += '\n\n';
      }
      
      if (progressPost?.notes) {
        accomplishments += '📝 Weekly Reflections:\n';
        accomplishments += progressPost.notes;
      }

      // If no objectives or reflections, show a different message
      if (accomplishments.trim() === '') {
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
    }
  };

  const handleEditWeek = () => {
    console.log('Editing week:', weekStart);
    uncompleteWeek();
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
          onDeleteObjective={handleDeleteObjective}
          onAddObjective={handleAddObjective}
        />

        <WeeklyProgressNotesSection
          progressNotes={progressNotes}
          isWeekCompleted={isWeekCompleted}
          onNotesChange={setProgressNotes}
        />

        <WeeklyProgressActions
          isWeekCompleted={isWeekCompleted}
          weekNumber={weekNumber}
          isSavingNotes={isSavingNotes}
          isCompletingWeek={isPostingToFeed}
          isUncompletingWeek={isUncompletingWeek}
          onSaveNotes={handleSaveNotes}
          onPostToFeed={handlePostToFeed}
          onEditWeek={handleEditWeek}
        />
      </CardContent>
    </Card>
  );
};

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { useGoals } from "@/hooks/useGoals";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { WeeklyObjectivesList } from "@/components/goals/WeeklyObjectivesList";
import { WeekHeader } from "@/components/thisweek/WeekHeader";
import { WeeklyReflectionCard } from "@/components/thisweek/WeeklyReflectionCard";
import { ShareWeekCard } from "@/components/thisweek/ShareWeekCard";

interface ThisWeekViewProps {
  weekStart?: string;
  onNavigateWeek?: (direction: 'previous' | 'next') => void;
}

export const ThisWeekView = ({ weekStart, onNavigateWeek }: ThisWeekViewProps) => {
  const { user } = useAuth();
  const { goals } = useGoals();
  const queryClient = useQueryClient();
  const [isSharing, setIsSharing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
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

  const handleViewInCommunity = () => {
    if (feedPost) {
      // Navigate to the specific post in the community feed
      window.open(`/community?post=${feedPost.id}`, '_blank');
    } else {
      window.open('/community', '_blank');
    }
  };

  const handleShareWeek = async () => {
    if (!user) return;
    
    setIsSharing(true);
    try {
      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const completedObjectives = objectives?.filter(obj => obj.is_completed) || [];
      const pendingObjectives = objectives?.filter(obj => !obj.is_completed) || [];
      
      let accomplishments = '';
      
      if (completedObjectives.length > 0 || pendingObjectives.length > 0) {
        accomplishments += '🎯 This Week\'s Progress:\n\n';
        
        if (completedObjectives.length > 0) {
          accomplishments += '✅ Completed:\n';
          accomplishments += completedObjectives.map(obj => `• ${obj.text}`).join('\n');
          accomplishments += '\n\n';
        }
        
        if (pendingObjectives.length > 0) {
          accomplishments += '🔄 In Progress:\n';
          accomplishments += pendingObjectives.map(obj => `• ${obj.text}`).join('\n');
          accomplishments += '\n\n';
        }
      }
      
      if (progressPost?.notes?.trim()) {
        accomplishments += '💭 Weekly Reflection:\n';
        accomplishments += progressPost.notes;
        accomplishments += '\n\n';
      }

      if (!accomplishments.trim()) {
        accomplishments = 'Focused on personal growth this week.';
      }

      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const completedCount = completedObjectives.length;
      const totalCount = objectives?.length || 0;
      const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      // Create the feed post
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          name: profile?.full_name || 'Anonymous',
          accomplishments: accomplishments,
          priorities: '',
          help: '',
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
        toast({
          title: "Success",
          description: "Your weekly progress has been shared with the community!",
        });
        // Mark week as completed
        await supabase
          .from('weekly_progress_posts')
          .upsert({
            user_id: user.id,
            week_start: currentWeekStart,
            notes: progressPost?.notes || "",
            is_completed: true,
            completed_at: new Date().toISOString(),
          });
        
        queryClient.invalidateQueries({ queryKey: ['week-feed-post'] });
        queryClient.invalidateQueries({ queryKey: ['weekly-progress-post'] });
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
  const isCurrentWeek = WeeklyProgressService.getWeekStart() === currentWeekStart;
  const isPastWeek = currentWeekStart < WeeklyProgressService.getWeekStart();
  const isReadOnly = isPastWeek && hasShared;

  return (
    <div className="space-y-6">
      {/* Week Header */}
      <WeekHeader
        weekNumber={weekNumber}
        weekRange={weekRange}
        currentWeekStart={currentWeekStart}
        completedCount={completedCount}
        totalCount={totalCount}
        onNavigateWeek={onNavigateWeek}
      />

      {/* Weekly Objectives */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">This Week's Focus</CardTitle>
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
          />
        </CardContent>
      </Card>

      {/* Weekly Reflection */}
      <WeeklyReflectionCard
        initialNotes={progressPost?.notes || ""}
        onUpdateNotes={updateProgressNotes}
        isReadOnly={isReadOnly}
      />

      {/* Share Week */}
      <ShareWeekCard
        hasShared={hasShared}
        isCurrentWeek={isCurrentWeek}
        isSharing={isSharing}
        feedPost={feedPost}
        objectives={objectives || []}
        reflectionValue={progressPost?.notes || ""}
        onShareWeek={handleShareWeek}
        onViewInCommunity={handleViewInCommunity}
      />
    </div>
  );
};
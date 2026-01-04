import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { GoalUpdatesService } from "@/services/goalUpdatesService";
import { WeeklyObjective } from "@/types/weeklyProgress";

interface UseWeeklyShareProps {
  userId: string | undefined;
  currentWeekStart: string;
  objectives: WeeklyObjective[] | undefined;
  progressNotes: string;
  incompleteReflections: Record<string, string>;
}

interface HelpRequest {
  goalId: string;
  message: string;
}

export const useWeeklyShare = ({
  userId,
  currentWeekStart,
  objectives,
  progressNotes,
  incompleteReflections,
}: UseWeeklyShareProps) => {
  const queryClient = useQueryClient();
  const [isSharing, setIsSharing] = useState(false);
  const [showShareConfirmation, setShowShareConfirmation] = useState(false);

  const handleRequestShare = useCallback(() => {
    setShowShareConfirmation(true);
  }, []);

  const handleConfirmShare = useCallback(async (helpRequest?: HelpRequest) => {
    if (!userId) return;
    
    setShowShareConfirmation(false);
    setIsSharing(true);
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      const latestProgressPost = await WeeklyProgressService.getWeeklyProgressPost(currentWeekStart);

      const completedObjectives = objectives?.filter(obj => obj.is_completed) || [];
      const pendingObjectives = objectives?.filter(obj => !obj.is_completed) || [];
      
      let accomplishments = buildAccomplishmentsText(
        completedObjectives,
        pendingObjectives,
        latestProgressPost?.incomplete_reflections,
        latestProgressPost?.notes
      );

      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const completedCount = completedObjectives.length;
      const totalCount = objectives?.length || 0;
      const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          name: profile?.full_name || 'Anonymous',
          accomplishments: accomplishments,
          priorities: '',
          help: '',
          reflection: latestProgressPost?.notes?.trim() || '',
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
        return;
      }

      // Create goal updates for each goal with progress this week
      try {
        const goalUpdates = await GoalUpdatesService.createGoalUpdatesFromWeeklyShare({
          userId,
          weekStart: currentWeekStart,
          objectives: objectives || [],
          weeklyReflection: latestProgressPost?.notes?.trim() || ''
        });
        console.log(`[useWeeklyShare] Created ${goalUpdates.length} goal updates`);
      } catch (goalUpdateError) {
        console.error('[useWeeklyShare] Failed to create goal updates:', goalUpdateError);
      }

      // Create help request if user asked for help
      if (helpRequest) {
        try {
          await GoalUpdatesService.createHelpRequest({
            userId,
            goalId: helpRequest.goalId,
            helpMessage: helpRequest.message,
            weekStart: currentWeekStart
          });
          console.log(`[useWeeklyShare] Created help request for goal ${helpRequest.goalId}`);
        } catch (helpError) {
          console.error('[useWeeklyShare] Failed to create help request:', helpError);
        }
      }

      await WeeklyProgressService.completeWeek(currentWeekStart);
      
      toast({
        title: "Success",
        description: helpRequest 
          ? "Your weekly progress has been shared and help request sent to friends!"
          : "Your weekly progress has been shared with the community! This week is now locked.",
      });
      
      await queryClient.invalidateQueries({ queryKey: ['week-feed-post'] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-progress-post'] });
      await queryClient.invalidateQueries({ queryKey: ['goal-updates'] });
      await queryClient.refetchQueries({ queryKey: ['weekly-progress-post', userId, currentWeekStart] });

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
  }, [userId, currentWeekStart, objectives, queryClient]);

  const handleViewInCommunity = useCallback((feedPostId?: string) => {
    if (feedPostId) {
      window.open(`/community?post=${feedPostId}`, '_blank');
    } else {
      window.open('/community', '_blank');
    }
  }, []);

  return {
    isSharing,
    showShareConfirmation,
    setShowShareConfirmation,
    handleRequestShare,
    handleConfirmShare,
    handleViewInCommunity,
  };
};

function buildAccomplishmentsText(
  completedObjectives: WeeklyObjective[],
  pendingObjectives: WeeklyObjective[],
  incompleteReflectionsRaw: unknown,
  notes?: string | null
): string {
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
        if (incompleteReflectionsRaw && typeof incompleteReflectionsRaw === 'object' && !Array.isArray(incompleteReflectionsRaw)) {
          reflectionsObj = incompleteReflectionsRaw as Record<string, string>;
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
  
  if (!accomplishments.trim()) {
    accomplishments = 'Focused on personal growth this week.';
  }

  return accomplishments;
}

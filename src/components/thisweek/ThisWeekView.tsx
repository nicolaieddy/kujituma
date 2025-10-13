import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";
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
import { ThisWeekSkeleton } from "@/components/thisweek/ThisWeekSkeleton";
import { ShareConfirmationDialog } from "@/components/thisweek/ShareConfirmationDialog";
import { CommitmentSelector } from "@/components/commitments/CommitmentSelector";
import { AccountabilityPartnerCard } from "@/components/accountability/AccountabilityPartnerCard";
import { PartnerProgressView } from "@/components/accountability/PartnerProgressView";
import { CheckInHistory } from "@/components/accountability/CheckInHistory";
import { commitmentsService, PublicCommitment } from "@/services/commitmentsService";
import { accountabilityService, AccountabilityPartner } from "@/services/accountabilityService";

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
  const [showShareConfirmation, setShowShareConfirmation] = useState(false);
  const [showCommitmentSelector, setShowCommitmentSelector] = useState(false);
  const [commitments, setCommitments] = useState<PublicCommitment[]>([]);
  const [accountabilityPartner, setAccountabilityPartner] = useState<AccountabilityPartner | null>(null);
  
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

  const handleViewInCommunity = () => {
    if (feedPost) {
      // Navigate to the specific post in the community feed
      window.open(`/community?post=${feedPost.id}`, '_blank');
    } else {
      window.open('/community', '_blank');
    }
  };

  const handleRequestShare = () => {
    // Show confirmation dialog first
    setShowShareConfirmation(true);
  };

  const handleConfirmShare = async () => {
    if (!user) return;
    
    setShowShareConfirmation(false);
    setIsSharing(true);
    try {
      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Get the latest progress post data to ensure we have the most current reflection
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
          
          // Add reflection notes for incomplete objectives if available
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
      
      // Use the latest weekly reflection from the freshly fetched data
      const weeklyReflection = latestProgressPost?.notes?.trim() || '';
      
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
        // Mark week as completed using the proper service method
        await WeeklyProgressService.completeWeek(currentWeekStart);
        
        toast({
          title: "Success",
          description: "Your weekly progress has been shared with the community! This week is now locked.",
        });
        
        // Force refresh both queries to ensure UI updates
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

  // Load commitments and accountability partner
  useEffect(() => {
    const loadCommitments = async () => {
      if (user) {
        const data = await commitmentsService.getPublicCommitments(user.id, currentWeekStart);
        setCommitments(data);
      }
    };

    const loadAccountabilityPartner = async () => {
      const partner = await accountabilityService.getAccountabilityPartner();
      setAccountabilityPartner(partner);
    };

    loadCommitments();
    loadAccountabilityPartner();
  }, [user, currentWeekStart]);

  const handleCommitmentsSet = () => {
    if (user) {
      commitmentsService.getPublicCommitments(user.id, currentWeekStart).then(setCommitments);
    }
  };

  const handlePartnerUpdate = () => {
    accountabilityService.getAccountabilityPartner().then(setAccountabilityPartner);
  };

  const completedCount = objectives?.filter(obj => obj.is_completed).length || 0;
  const totalCount = objectives?.length || 0;
  const hasShared = !!feedPost;
  const isCurrentWeek = WeeklyProgressService.isCurrentWeek(currentWeekStart);
  const isPastWeek = currentWeekStart < WeeklyProgressService.getWeekStart();
  
  // Enforce immutability: once a week is completed (shared), it becomes read-only
  const isWeekCompleted = progressPost?.is_completed || false;
  const isReadOnly = isWeekCompleted;

  const hasCommitments = commitments.length === 3;
  const committedIds = commitments.map(c => c.objective_id);

  // Show loading skeleton while data is being fetched
  if (weeklyDataLoading) {
    return <ThisWeekSkeleton />;
  }

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

      {/* Commitment Declaration */}
      {!isReadOnly && isCurrentWeek && totalCount > 0 && (
        <Card className={`${hasCommitments ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className={`h-5 w-5 ${hasCommitments ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <h3 className="font-semibold">
                    {hasCommitments ? '🎯 Your Top 3 Commitments' : 'Declare Your Top 3 Objectives'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {hasCommitments 
                      ? 'Visible to your friends as public commitments'
                      : 'Make a public commitment to stay accountable'}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowCommitmentSelector(true)}
                variant={hasCommitments ? 'outline' : 'default'}
                className={hasCommitments ? '' : 'gradient-primary'}
              >
                {hasCommitments ? 'Change' : 'Select Top 3'}
              </Button>
            </div>
            {hasCommitments && (
              <div className="mt-4 space-y-2">
                {commitments.map((commitment, index) => (
                  <div
                    key={commitment.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      commitment.is_completed
                        ? 'bg-success/10 border-success/20'
                        : 'bg-background border-primary/20'
                    }`}
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <p className={`flex-1 text-sm ${commitment.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                      {commitment.objective_text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Accountability Partner */}
      {accountabilityPartner && (
        <>
          <AccountabilityPartnerCard
            partner={accountabilityPartner}
            weekStart={currentWeekStart}
            onStatusChange={handlePartnerUpdate}
          />
          
          <CheckInHistory
            partnershipId={accountabilityPartner.partnership_id}
            weekStart={currentWeekStart}
            partnerId={accountabilityPartner.partner_id}
            partnerName={accountabilityPartner.full_name}
            partnerAvatar={accountabilityPartner.avatar_url}
          />

          <PartnerProgressView
            partnerId={accountabilityPartner.partner_id}
            weekStart={currentWeekStart}
          />
        </>
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
          />
        </CardContent>
      </Card>

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

      {/* Commitment Selector */}
      <CommitmentSelector
        open={showCommitmentSelector}
        onOpenChange={setShowCommitmentSelector}
        objectives={objectives || []}
        weekStart={currentWeekStart}
        currentCommitments={committedIds}
        onCommitmentsSet={handleCommitmentsSet}
      />
    </div>
  );
};
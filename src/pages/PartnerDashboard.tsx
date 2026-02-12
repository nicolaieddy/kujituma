import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PartnerGoalsKanban } from '@/components/accountability/PartnerGoalsKanban';
import { PartnerHabitsCard } from '@/components/accountability/PartnerHabitsCard';
import { VisibilityHistoryTimeline } from '@/components/accountability/VisibilityHistoryTimeline';
import { CheckInDialog } from '@/components/accountability/CheckInDialog';
import { CheckInsFeed, CheckInsFeedRef } from '@/components/accountability/CheckInsFeed';
import { FeedbackCommentPopover } from '@/components/accountability/FeedbackCommentPopover';
import { ObjectiveCommentsSheet } from '@/components/accountability/ObjectiveCommentsSheet';
import { supabase } from '@/integrations/supabase/client';
import { PartnershipSettingsModal } from '@/components/accountability/PartnershipSettingsModal';
import { PartnerSwitcher, PartnerSwitcherRef } from '@/components/accountability/PartnerSwitcher';
import { accountabilityService } from '@/services/accountabilityService';
import { usePartnerDashboardData } from '@/hooks/usePartnerDashboardData';
import { usePartnerObjectiveFeedback } from '@/hooks/useObjectiveFeedback';
import { useObjectiveCommentCounts } from '@/hooks/useObjectiveComments';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Target, 
  CheckCircle2, 
  Circle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Settings,
  MessageSquare,
  Send,
  ListChecks,
  RefreshCw
} from 'lucide-react';
import { format, startOfWeek, addWeeks, subWeeks, isSameWeek, formatDistanceToNow } from 'date-fns';

const PartnerDashboard = () => {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [checkInsOpen, setCheckInsOpen] = useState(false);
  const [weeklyNote, setWeeklyNote] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);
  const [commentsObjectiveId, setCommentsObjectiveId] = useState<string | null>(null);
  const [commentsObjectiveText, setCommentsObjectiveText] = useState('');
  
  const checkInsFeedRef = useRef<CheckInsFeedRef>(null);
  const partnerSwitcherRef = useRef<PartnerSwitcherRef>(null);

  // Use consolidated hook - replaces 18 queries with 1
  const { data, isLoading, error, refetch } = usePartnerDashboardData(partnerId, selectedWeekStart);

  // Extract data from consolidated response
  const partnerProfile = data?.profile || null;
  const goals = data?.goals || [];
  const weeklyObjectives = data?.objectives || [];
  const habitStats = data?.habit_stats || [];
  const partnershipDetails = data?.partnership || null;
  const canViewPartner = data?.can_view_partner_goals ?? true;
  const partnerVisibility = {
    canViewPartnerGoals: data?.can_view_partner_goals ?? false,
    partnerCanViewMyGoals: data?.partner_can_view_my_goals ?? false,
    myCheckInCadence: data?.my_check_in_cadence ?? 'weekly',
  };
  
  // Get current user's profile from auth context
  const currentUserProfile = user ? {
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'You',
    avatar_url: user.user_metadata?.avatar_url || null,
  } : null;

  // Get objective IDs for feedback hook - must be called before any early returns
  const objectiveIds = useMemo(() => weeklyObjectives.map(o => o.id), [weeklyObjectives]);
  const { feedback, submitFeedback, removeFeedback, isSubmitting, getFeedbackForObjective } = usePartnerObjectiveFeedback(objectiveIds);
  const { counts: commentCounts, unreadCounts } = useObjectiveCommentCounts(objectiveIds);

  const isCurrentWeek = isSameWeek(selectedWeekStart, new Date(), { weekStartsOn: 1 });

  const handlePreviousWeek = () => {
    setSelectedWeekStart(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setSelectedWeekStart(prev => addWeeks(prev, 1));
  };

  const handleCurrentWeek = () => {
    setSelectedWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  const handleRecordCheckIn = async (message?: string) => {
    if (!partnershipDetails || !currentUserProfile) {
      throw new Error('Missing partnership details');
    }
    
    const tempId = checkInsFeedRef.current?.addOptimisticCheckIn({
      message,
      week_start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      initiator_profile: currentUserProfile,
    });
    
    try {
      const result = await accountabilityService.recordCheckIn(partnershipDetails.id, message);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to record check-in');
      }
      
      if (tempId) checkInsFeedRef.current?.confirmOptimisticCheckIn(tempId);
      Promise.all([
        checkInsFeedRef.current?.refresh(),
        partnerSwitcherRef.current?.refresh(),
        refetch()
      ]).catch(console.error);
      toast.success('Check-in recorded!');
    } catch (err) {
      console.error('Error recording check-in:', err);
      if (tempId) checkInsFeedRef.current?.removeOptimisticCheckIn(tempId);
      throw err;
    }
  };

  const handleSendWeeklyNote = async () => {
    if (!weeklyNote.trim()) return;
    setIsSendingNote(true);
    try {
      await handleRecordCheckIn(weeklyNote.trim());
      setWeeklyNote('');
      setCheckInsOpen(true);
    } catch (err) {
      // Error already handled in handleRecordCheckIn
    } finally {
      setIsSendingNote(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate('/friends?tab=partners')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Partners
          </Button>
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="py-12 text-center">
              <p className="text-destructive font-medium">{error instanceof Error ? error.message : 'Failed to load partner data'}</p>
              <p className="text-muted-foreground text-sm mt-2">
                Make sure you are connected as accountability partners.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show access restricted message if partner hasn't granted view permission
  if (!canViewPartner && partnerProfile) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate('/friends?tab=partners')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Partners
          </Button>
          
          <Card className="border-border mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                  <AvatarImage src={partnerProfile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {partnerProfile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-foreground">
                    {partnerProfile.full_name}
                  </h1>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium mb-2">Access Restricted</p>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                {partnerProfile.full_name} hasn't granted you permission to view their goals yet. 
                You can adjust visibility settings in your partnership configuration.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const completedObjectives = weeklyObjectives.filter(o => o.is_completed).length;
  const totalObjectives = weeklyObjectives.length;
  const progressPercentage = totalObjectives > 0 ? Math.round((completedObjectives / totalObjectives) * 100) : 0;

  // Calculate habit completion stats for the summary row
  const totalHabits = habitStats.reduce((sum, h) => sum + (h.goal.habit_items?.length || 1), 0);
  const completedHabitsCount = habitStats.filter(h => h.completionRate > 0).length;

  const initials = partnerProfile?.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
          {/* Partner Switcher */}
          {partnerId && <PartnerSwitcher ref={partnerSwitcherRef} currentPartnerId={partnerId} />}
          
          {/* Back Button */}
          <Button variant="ghost" onClick={() => navigate('/friends?tab=partners')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Partners
          </Button>

          {/* Partner Header with Check-in Actions */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                  <AvatarImage src={partnerProfile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-foreground">
                    {partnerProfile?.full_name}
                  </h1>
                  {partnerProfile?.about_me && (
                    <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                      {partnerProfile.about_me}
                    </p>
                  )}
                </div>
                <Button variant="outline" onClick={() => navigate(`/profile/${partnerId}`)}>
                  View Profile
                </Button>
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {partnershipDetails?.last_check_in_at ? (
                    <span>Last check-in {formatDistanceToNow(new Date(partnershipDetails.last_check_in_at), { addSuffix: true })}</span>
                  ) : (
                    <span>No check-ins yet</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSettingsModalOpen(true)}
                        className="gap-1.5"
                      >
                        <Settings className="h-4 w-4" />
                        <span className="hidden sm:inline">Settings</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Partnership settings</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Check-in Dialog */}
          <CheckInDialog
            open={checkInDialogOpen}
            onOpenChange={setCheckInDialogOpen}
            partnerName={partnerProfile?.full_name || 'Partner'}
            onConfirm={handleRecordCheckIn}
          />

          {/* Partnership Settings Modal */}
          <PartnershipSettingsModal
            open={settingsModalOpen}
            onOpenChange={setSettingsModalOpen}
            partnerId={partnerId!}
            partnerName={partnerProfile?.full_name || 'Partner'}
            currentCadence={partnerVisibility.myCheckInCadence}
            canViewPartnerGoals={partnerVisibility.canViewPartnerGoals}
            partnerCanViewMyGoals={partnerVisibility.partnerCanViewMyGoals}
            onSettingsChange={() => {
              refetch();
            }}
          />

          {/* ===== WEEKLY PERFORMANCE CARD (merged week nav + objectives + summary) ===== */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              {/* Week Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousWeek}
                      className="px-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextWeek}
                      className="px-2"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <CardTitle className="text-foreground text-xl sm:text-2xl">
                      {isCurrentWeek ? "This Week" : format(selectedWeekStart, 'MMM d, yyyy')}
                    </CardTitle>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      {format(selectedWeekStart, 'MMMM d')} – {format(addWeeks(selectedWeekStart, 1), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
                {!isCurrentWeek && (
                  <Button variant="ghost" size="sm" onClick={handleCurrentWeek} className="text-xs">
                    Today
                  </Button>
                )}
              </div>

              {/* Progress Summary Row */}
              {(totalObjectives > 0 || totalHabits > 0) && (
                <div className="mt-4 pt-3 border-t border-border space-y-2">
                  <div className="flex items-center gap-3">
                    <Progress value={progressPercentage} className="flex-1 h-2" animated={false} />
                    <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                      {progressPercentage}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {totalObjectives > 0 && (
                      <div className="flex items-center gap-1.5">
                        <ListChecks className="h-3.5 w-3.5" />
                        <span>{completedObjectives}/{totalObjectives} objectives</span>
                      </div>
                    )}
                    {totalHabits > 0 && (
                      <div className="flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>{completedHabitsCount} active habit{completedHabitsCount !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardHeader>

            {/* Objectives List */}
            <CardContent className="pt-0">
              {weeklyObjectives.length > 0 ? (
                <div className="space-y-2">
                  {weeklyObjectives.map((objective) => {
                    const objFeedback = getFeedbackForObjective(objective.id);
                    return (
                      <div 
                        key={objective.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors group"
                      >
                        {objective.is_completed ? (
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm ${objective.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {objective.text}
                          </span>
                          {objective.goal?.title && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Target className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate">
                                {objective.goal.title}
                              </span>
                            </div>
                          )}
                        </div>
                        {objective.scheduled_day && (
                          <Badge variant="secondary" className="text-xs flex-shrink-0 mr-1">
                            {objective.scheduled_day}
                          </Badge>
                        )}
                        <FeedbackCommentPopover
                          objectiveId={objective.id}
                          feedback={objFeedback}
                          onSubmitFeedback={(feedbackType, comment) => 
                            submitFeedback({ objectiveId: objective.id, feedbackType, comment })
                          }
                          onRemoveFeedback={() => removeFeedback(objective.id)}
                          isSubmitting={isSubmitting}
                          commentCount={commentCounts[objective.id] || 0}
                          onOpenComments={() => {
                            setCommentsObjectiveId(objective.id);
                            setCommentsObjectiveText(objective.text);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No objectives set for this week.
                </div>
              )}

              {/* Weekly Note Quick Action */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex gap-2">
                  <Textarea
                    placeholder={`Leave a note about ${isCurrentWeek ? 'this' : 'that'} week...`}
                    value={weeklyNote}
                    onChange={(e) => setWeeklyNote(e.target.value)}
                    className="min-h-[40px] h-10 resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendWeeklyNote();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleSendWeeklyNote}
                    disabled={!weeklyNote.trim() || isSendingNote}
                    className="px-3 self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Habits Review - now week-aware */}
          <PartnerHabitsCard 
            habitStats={habitStats} 
            isLoading={isLoading} 
            partnerId={partnerId || ''} 
            weekStart={selectedWeekStart}
          />

          {/* Check-ins Feed - Collapsible */}
          {partnershipDetails && partnerProfile && (
            <Collapsible open={checkInsOpen} onOpenChange={setCheckInsOpen}>
              <Card className="border-border">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        Check-in History
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCheckInDialogOpen(true);
                          }}
                          className="text-xs"
                        >
                          New Check-in
                        </Button>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${checkInsOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <CheckInsFeed
                      ref={checkInsFeedRef}
                      partnershipId={partnershipDetails.id}
                      currentUserId={user.id}
                      currentUserProfile={currentUserProfile || undefined}
                      partnerName={partnerProfile.full_name}
                      maxVisible={2}
                      onRecordCheckIn={() => setCheckInDialogOpen(true)}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Goals Kanban */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5" />
                Goals {!isLoading && `(${goals.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['In Progress', 'Paused', 'Completed'].map((column) => (
                    <div key={column} className="space-y-3">
                      <Skeleton className="h-5 w-24" />
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <div key={i} className="p-3 rounded-lg border border-border bg-card">
                            <Skeleton className="h-4 w-3/4 mb-2" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PartnerGoalsKanban goals={goals} />
              )}
            </CardContent>
          </Card>

          {/* Visibility History Timeline */}
          {partnershipDetails && user && partnerProfile && (
            <VisibilityHistoryTimeline
              partnershipId={partnershipDetails.id}
              partnerId={partnerId!}
              partnerName={partnerProfile.full_name}
              currentUserId={user.id}
              user1Id={partnershipDetails.user1_id}
              user2Id={partnershipDetails.user2_id}
            />
          )}

          {/* Objective Comments Sheet */}
          <ObjectiveCommentsSheet
            open={!!commentsObjectiveId}
            onOpenChange={(open) => { if (!open) setCommentsObjectiveId(null); }}
            objectiveId={commentsObjectiveId}
            objectiveText={commentsObjectiveText}
          />
      </div>
    </div>
  );
};

export default PartnerDashboard;

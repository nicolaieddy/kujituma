import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PartnerGoalsKanban } from '@/components/accountability/PartnerGoalsKanban';
import { PartnerHabitsCard } from '@/components/accountability/PartnerHabitsCard';
import { VisibilityHistoryTimeline } from '@/components/accountability/VisibilityHistoryTimeline';
import { CheckInDialog } from '@/components/accountability/CheckInDialog';
import { CheckInsFeed, CheckInsFeedRef } from '@/components/accountability/CheckInsFeed';
import { FeedbackCommentPopover } from '@/components/accountability/FeedbackCommentPopover';
import { supabase } from '@/integrations/supabase/client';
import { PartnershipSettingsModal } from '@/components/accountability/PartnershipSettingsModal';
import { PartnerSwitcher, PartnerSwitcherRef } from '@/components/accountability/PartnerSwitcher';
import { 
  accountabilityService, 
  PartnerGoal, 
  PartnerWeeklyObjective,
  CheckInCadence
} from '@/services/accountabilityService';
import { usePartnerObjectiveFeedback } from '@/hooks/useObjectiveFeedback';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Target, 
  CheckCircle2, 
  Circle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Settings
} from 'lucide-react';
import { format, startOfWeek, addWeeks, subWeeks, isSameWeek, formatDistanceToNow } from 'date-fns';

const PartnerDashboard = () => {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [partnerProfile, setPartnerProfile] = useState<{
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
    about_me: string | null;
  } | null>(null);
  const [goals, setGoals] = useState<PartnerGoal[]>([]);
  const [weeklyObjectives, setWeeklyObjectives] = useState<PartnerWeeklyObjective[]>([]);
  const [habitStats, setHabitStats] = useState<any[]>([]);
  const [loadingHabits, setLoadingHabits] = useState(false);
  const [partnershipDetails, setPartnershipDetails] = useState<{
    id: string;
    user1_id: string;
    user2_id: string;
    last_check_in_at: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingObjectives, setLoadingObjectives] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canViewPartner, setCanViewPartner] = useState(true);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [partnerVisibility, setPartnerVisibility] = useState<{
    canViewPartnerGoals: boolean;
    partnerCanViewMyGoals: boolean;
    myCheckInCadence: CheckInCadence;
  }>({ canViewPartnerGoals: false, partnerCanViewMyGoals: false, myCheckInCadence: 'weekly' });
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    full_name: string;
    avatar_url: string | null;
  } | null>(null);
  
  const checkInsFeedRef = useRef<CheckInsFeedRef>(null);
  const partnerSwitcherRef = useRef<PartnerSwitcherRef>(null);

  // Get objective IDs for feedback hook - must be called before any early returns
  const objectiveIds = useMemo(() => weeklyObjectives.map(o => o.id), [weeklyObjectives]);
  const { feedback, submitFeedback, removeFeedback, isSubmitting, getFeedbackForObjective } = usePartnerObjectiveFeedback(objectiveIds);

  const getWeekStartString = (date: Date) => {
    return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  };

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

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!partnerId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // First check if we have permission to view this partner
        const partners = await accountabilityService.getPartners();
        const partnerData = partners.find(p => p.partner_id === partnerId);
        
        if (!partnerData) {
          setError('Partner not found or partnership not active');
          return;
        }
        
        // Store visibility settings
        setPartnerVisibility({
          canViewPartnerGoals: partnerData.can_view_partner_goals,
          partnerCanViewMyGoals: partnerData.partner_can_view_my_goals,
          myCheckInCadence: partnerData.my_check_in_cadence || 'weekly',
        });
        
        if (!partnerData.can_view_partner_goals) {
          setCanViewPartner(false);
          // Still fetch profile for display
          const profile = await accountabilityService.getPartnerProfile(partnerId);
          setPartnerProfile(profile);
          return;
        }
        
        setCanViewPartner(true);
        
        const [profile, goalsData, objectivesData, partnership, habitsData] = await Promise.all([
          accountabilityService.getPartnerProfile(partnerId),
          accountabilityService.getPartnerGoals(partnerId),
          accountabilityService.getPartnerWeeklyObjectives(partnerId, getWeekStartString(selectedWeekStart)),
          accountabilityService.getPartnershipDetails(partnerId),
          accountabilityService.getPartnerHabitStats(partnerId)
        ]);
        
        if (!profile) {
          setError('Partner not found');
          return;
        }
        
        setPartnerProfile(profile);
        setGoals(goalsData);
        setWeeklyObjectives(objectivesData);
        setPartnershipDetails(partnership);
        setHabitStats(habitsData);
      } catch (err) {
        console.error('Error fetching partner data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load partner data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [partnerId]);

  // Fetch objectives when week changes
  useEffect(() => {
    const fetchObjectives = async () => {
      if (!partnerId || !canViewPartner || loading) return;
      
      try {
        setLoadingObjectives(true);
        const objectivesData = await accountabilityService.getPartnerWeeklyObjectives(
          partnerId, 
          getWeekStartString(selectedWeekStart)
        );
        setWeeklyObjectives(objectivesData);
      } catch (err) {
        console.error('Error fetching objectives:', err);
      } finally {
        setLoadingObjectives(false);
      }
    };

    fetchObjectives();
  }, [selectedWeekStart, partnerId, canViewPartner, loading]);

  // Fetch current user's profile
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setCurrentUserProfile(data);
      }
    };
    
    fetchCurrentUserProfile();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);


  const handleRecordCheckIn = async (message?: string) => {
    if (!partnershipDetails) return;
    try {
      await accountabilityService.recordCheckIn(partnershipDetails.id, message);
      // Refresh partnership details to get updated last_check_in_at
      const updatedPartnership = await accountabilityService.getPartnershipDetails(partnerId!);
      setPartnershipDetails(updatedPartnership);
      // Refresh the check-ins feed and partner switcher immediately
      await Promise.all([
        checkInsFeedRef.current?.refresh(),
        partnerSwitcherRef.current?.refresh()
      ]);
      toast.success('Check-in recorded!');
    } catch (err) {
      console.error('Error recording check-in:', err);
      toast.error('Failed to record check-in');
    }
  };

  if (authLoading || loading) {
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
              <p className="text-destructive font-medium">{error}</p>
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
          
          {/* Partner Header */}
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
              
              {/* Subtle check-in action row */}
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
              // Refetch data when settings change
              window.location.reload();
            }}
          />

          {/* Check-ins Feed - Full History - Moved to top */}
          {partnershipDetails && partnerProfile && (
            <Card className="border-border">
              <CardContent className="pt-6">
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
            </Card>
          )}

          {/* Weekly Progress - matching ThisWeekView style */}
          <Card className="border-border">
            <CardHeader>
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
                {totalObjectives > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {completedObjectives}/{totalObjectives} completed
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Weekly Objectives List */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Weekly Focus</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingObjectives ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                      <Skeleton className="h-7 w-16" />
                    </div>
                  ))}
                </div>
              ) : weeklyObjectives.length > 0 ? (
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
                        {/* Partner Feedback Buttons */}
                        <FeedbackCommentPopover
                          objectiveId={objective.id}
                          feedback={objFeedback}
                          onSubmitFeedback={(feedbackType, comment) => 
                            submitFeedback({ objectiveId: objective.id, feedbackType, comment })
                          }
                          onRemoveFeedback={() => removeFeedback(objective.id)}
                          isSubmitting={isSubmitting}
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
            </CardContent>
          </Card>

          {/* Habits Review */}
          <PartnerHabitsCard habitStats={habitStats} isLoading={loading} partnerId={partnerId || ''} />

          {/* Goals Kanban */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5" />
                Goals ({goals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PartnerGoalsKanban goals={goals} />
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
      </div>
    </div>
  );
};

export default PartnerDashboard;

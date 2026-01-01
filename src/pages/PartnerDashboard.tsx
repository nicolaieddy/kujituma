import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PartnerGoalCard } from '@/components/accountability/PartnerGoalCard';
import { VisibilityHistoryTimeline } from '@/components/accountability/VisibilityHistoryTimeline';
import { CheckInDialog } from '@/components/accountability/CheckInDialog';
import { 
  accountabilityService, 
  PartnerGoal, 
  PartnerWeeklyObjective 
} from '@/services/accountabilityService';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Target, 
  CheckCircle2, 
  Circle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  History,
  Clock
} from 'lucide-react';
import { format, startOfWeek, addWeeks, subWeeks, isSameWeek, formatDistanceToNow } from 'date-fns';

const PartnerDashboard = () => {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  
  const [partnerProfile, setPartnerProfile] = useState<{
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
    about_me: string | null;
  } | null>(null);
  const [goals, setGoals] = useState<PartnerGoal[]>([]);
  const [weeklyObjectives, setWeeklyObjectives] = useState<PartnerWeeklyObjective[]>([]);
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
        
        if (!partnerData.can_view_partner_goals) {
          setCanViewPartner(false);
          // Still fetch profile for display
          const profile = await accountabilityService.getPartnerProfile(partnerId);
          setPartnerProfile(profile);
          return;
        }
        
        setCanViewPartner(true);
        
        const [profile, goalsData, objectivesData, partnership] = await Promise.all([
          accountabilityService.getPartnerProfile(partnerId),
          accountabilityService.getPartnerGoals(partnerId),
          accountabilityService.getPartnerWeeklyObjectives(partnerId, getWeekStartString(selectedWeekStart)),
          accountabilityService.getPartnershipDetails(partnerId)
        ]);
        
        if (!profile) {
          setError('Partner not found');
          return;
        }
        
        setPartnerProfile(profile);
        setGoals(goalsData);
        setWeeklyObjectives(objectivesData);
        setPartnershipDetails(partnership);
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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleRecordCheckIn = async (message?: string) => {
    if (!partnershipDetails) return;
    try {
      await accountabilityService.recordCheckIn(partnershipDetails.id, message);
      // Refresh partnership details to get updated last_check_in_at
      const updatedPartnership = await accountabilityService.getPartnershipDetails(partnerId!);
      setPartnershipDetails(updatedPartnership);
      toast.success('Check-in recorded!');
    } catch (err) {
      console.error('Error recording check-in:', err);
      toast.error('Failed to record check-in');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader isAdmin={false} onSignOut={() => {}} />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader isAdmin={isAdmin} onSignOut={handleSignOut} />
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
      </div>
    );
  }

  // Show access restricted message if partner hasn't granted view permission
  if (!canViewPartner && partnerProfile) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader isAdmin={isAdmin} onSignOut={handleSignOut} />
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
    <div className="min-h-screen bg-background">
      <DashboardHeader isAdmin={isAdmin} onSignOut={handleSignOut} />
      
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
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
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/partner/${partnerId}/check-ins`)}
                        className="gap-1.5"
                      >
                        <History className="h-4 w-4" />
                        <span className="hidden sm:inline">History</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View check-in history</TooltipContent>
                  </Tooltip>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCheckInDialogOpen(true)}
                    className="gap-1.5"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Record Check-in
                  </Button>
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

          {/* Weekly Progress Summary */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  Weekly Plan
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePreviousWeek}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={isCurrentWeek ? "secondary" : "outline"}
                    size="sm"
                    onClick={handleCurrentWeek}
                    className="min-w-[140px] text-sm"
                  >
                    {isCurrentWeek 
                      ? "This Week" 
                      : format(selectedWeekStart, 'MMM d, yyyy')
                    }
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextWeek}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {!isCurrentWeek && (
                <p className="text-xs text-muted-foreground mt-1">
                  Week of {format(selectedWeekStart, 'MMMM d')} – {format(addWeeks(selectedWeekStart, 1), 'MMMM d, yyyy')}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {loadingObjectives ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">Loading objectives...</div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-6">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Objectives Completed</span>
                        <span className="text-sm font-medium">
                          {completedObjectives}/{totalObjectives}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-center px-4 py-2 bg-primary/10 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{progressPercentage}%</div>
                      <div className="text-xs text-muted-foreground">Complete</div>
                    </div>
                  </div>

                  {weeklyObjectives.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <h4 className="text-sm font-medium text-foreground">Objectives</h4>
                      {weeklyObjectives.map((objective) => (
                        <div 
                          key={objective.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          {objective.is_completed ? (
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className={`text-sm ${objective.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {objective.text}
                          </span>
                          {objective.scheduled_day && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {objective.scheduled_day}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {weeklyObjectives.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No objectives set for this week.
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Active Goals */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5" />
                Active Goals ({goals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {goals.length > 0 ? (
                <div className="grid gap-4">
                  {goals.map((goal) => (
                    <PartnerGoalCard key={goal.id} goal={goal} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active goals at the moment.</p>
                </div>
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
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;

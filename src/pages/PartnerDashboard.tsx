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
import { PartnerGoalCard } from '@/components/accountability/PartnerGoalCard';
import { 
  accountabilityService, 
  PartnerGoal, 
  PartnerWeeklyObjective 
} from '@/services/accountabilityService';
import { 
  ArrowLeft, 
  Target, 
  CheckCircle2, 
  Circle,
  Calendar,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current week start (Monday)
  const getWeekStart = () => {
    const now = new Date();
    const monday = startOfWeek(now, { weekStartsOn: 1 });
    return format(monday, 'yyyy-MM-dd');
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!partnerId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const [profile, goalsData, objectivesData] = await Promise.all([
          accountabilityService.getPartnerProfile(partnerId),
          accountabilityService.getPartnerGoals(partnerId),
          accountabilityService.getPartnerWeeklyObjectives(partnerId, getWeekStart())
        ]);
        
        if (!profile) {
          setError('Partner not found');
          return;
        }
        
        setPartnerProfile(profile);
        setGoals(goalsData);
        setWeeklyObjectives(objectivesData);
      } catch (err) {
        console.error('Error fetching partner data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load partner data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [partnerId]);

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

          {/* Partner Header */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                  <AvatarImage src={partnerProfile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
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
            </CardContent>
          </Card>

          {/* Weekly Progress Summary */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                This Week's Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                  <h4 className="text-sm font-medium text-foreground">Weekly Objectives</h4>
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
                  No objectives set for this week yet.
                </div>
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
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;

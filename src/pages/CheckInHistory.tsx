import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { accountabilityService, CheckInRecord } from '@/services/accountabilityService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, MessageSquare, Calendar, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const REACTIONS = ['👍', '❤️', '🔥', '👏', '💪'];

const CheckInHistory = () => {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [partnershipId, setPartnershipId] = useState<string | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<{
    full_name: string;
    avatar_url: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      if (!partnerId) return;

      try {
        setLoading(true);
        
        // Get partnership details
        const partnership = await accountabilityService.getPartnershipDetails(partnerId);
        if (!partnership) {
          setError('Partnership not found');
          return;
        }
        
        setPartnershipId(partnership.id);

        // Get partner profile
        const profile = await accountabilityService.getPartnerProfile(partnerId);
        if (profile) {
          setPartnerProfile({
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          });
        }

        // Get check-in history
        const history = await accountabilityService.getCheckInHistory(partnership.id);
        setCheckIns(history);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load check-in history');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [partnerId, user, navigate]);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleToggleReaction = async (checkInId: string, reaction: string) => {
    const result = await accountabilityService.toggleReaction(checkInId, reaction);
    if (result.success && partnershipId) {
      const history = await accountabilityService.getCheckInHistory(partnershipId);
      setCheckIns(history);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="flex items-center gap-4 mb-6">
        {partnerProfile && (
          <Avatar className="h-12 w-12 ring-2 ring-primary/20">
            <AvatarImage src={partnerProfile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(partnerProfile.full_name)}
            </AvatarFallback>
          </Avatar>
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Check-in History</h1>
          <p className="text-muted-foreground">
            with {partnerProfile?.full_name || 'Partner'}
          </p>
        </div>
      </div>

      {checkIns.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No check-ins recorded yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Record your first check-in to start tracking your accountability conversations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {checkIns.map((checkIn) => {
            const isCurrentUser = checkIn.initiated_by === user?.id;
            const initiatorName = isCurrentUser 
              ? 'You' 
              : checkIn.initiator_profile?.full_name || 'Partner';

            return (
              <Card key={checkIn.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      {!isCurrentUser && checkIn.initiator_profile?.avatar_url ? (
                        <AvatarImage src={checkIn.initiator_profile.avatar_url} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {isCurrentUser ? 'You' : getInitials(initiatorName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">
                          {initiatorName}
                        </span>
                        <span className="text-muted-foreground text-sm">recorded a check-in</span>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(checkIn.created_at))} ago
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Week of {format(new Date(checkIn.week_start), 'MMM d, yyyy')}
                        </div>
                      </div>

                      {checkIn.message && (
                        <p className="mt-3 text-sm text-foreground bg-muted/50 rounded-lg p-3">
                          "{checkIn.message}"
                        </p>
                      )}

                      {/* Reactions */}
                      <div className="flex items-center gap-1 mt-3 flex-wrap">
                        {REACTIONS.map((emoji) => {
                          const count = (checkIn.reactions || []).filter(r => r.reaction === emoji).length;
                          const hasReacted = (checkIn.reactions || []).some(r => r.reaction === emoji && r.user_id === user?.id);
                          
                          return (
                            <Tooltip key={emoji}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={hasReacted ? "secondary" : "ghost"}
                                  size="sm"
                                  className={`h-7 px-2 text-sm gap-1 ${count > 0 ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
                                  onClick={() => handleToggleReaction(checkIn.id, emoji)}
                                >
                                  <span>{emoji}</span>
                                  {count > 0 && <span className="text-xs">{count}</span>}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {hasReacted ? 'Remove reaction' : 'Add reaction'}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CheckInHistory;

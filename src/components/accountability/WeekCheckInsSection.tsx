import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { accountabilityService, CheckInRecord } from '@/services/accountabilityService';
import { MessageSquare, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

const REACTIONS = ['👍', '❤️', '🔥', '👏', '💪'];

interface WeekCheckInsSectionProps {
  partnershipId: string;
  weekStart: string;
  currentUserId: string;
}

export const WeekCheckInsSection = ({ 
  partnershipId, 
  weekStart, 
  currentUserId 
}: WeekCheckInsSectionProps) => {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCheckIns = async () => {
      setLoading(true);
      const data = await accountabilityService.getWeekCheckIns(partnershipId, weekStart);
      setCheckIns(data);
      setLoading(false);
    };
    fetchCheckIns();
  }, [partnershipId, weekStart]);

  const handleToggleReaction = async (checkInId: string, reaction: string) => {
    const result = await accountabilityService.toggleReaction(checkInId, reaction);
    if (result.success) {
      // Refresh check-ins
      const data = await accountabilityService.getWeekCheckIns(partnershipId, weekStart);
      setCheckIns(data);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading || checkIns.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Check-ins This Week ({checkIns.length})
      </h4>
      
      {checkIns.map((checkIn) => {
        const isCurrentUser = checkIn.initiated_by === currentUserId;
        const initiatorName = isCurrentUser 
          ? 'You' 
          : checkIn.initiator_profile?.full_name || 'Partner';
        
        // Group reactions by emoji
        const reactionCounts = (checkIn.reactions || []).reduce((acc, r) => {
          acc[r.reaction] = (acc[r.reaction] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const userReactions = new Set(
          (checkIn.reactions || [])
            .filter(r => r.user_id === user?.id)
            .map(r => r.reaction)
        );

        return (
          <Card key={checkIn.id} className="border-border bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Avatar className="h-6 w-6">
                  {!isCurrentUser && checkIn.initiator_profile?.avatar_url ? (
                    <AvatarImage src={checkIn.initiator_profile.avatar_url} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    {isCurrentUser ? 'You' : getInitials(initiatorName)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-foreground">
                      {initiatorName}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(checkIn.created_at))} ago
                    </span>
                  </div>
                  
                  {checkIn.message && (
                    <p className="mt-1 text-xs text-foreground">
                      "{checkIn.message}"
                    </p>
                  )}

                  {/* Reactions */}
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {REACTIONS.map((emoji) => {
                      const count = reactionCounts[emoji] || 0;
                      const hasReacted = userReactions.has(emoji);
                      
                      return (
                        <Tooltip key={emoji}>
                          <TooltipTrigger asChild>
                            <Button
                              variant={hasReacted ? "secondary" : "ghost"}
                              size="sm"
                              className={`h-6 px-1.5 text-xs gap-0.5 ${count > 0 ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
                              onClick={() => handleToggleReaction(checkIn.id, emoji)}
                            >
                              <span>{emoji}</span>
                              {count > 0 && <span className="text-[10px] ml-0.5">{count}</span>}
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
  );
};
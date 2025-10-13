import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare } from 'lucide-react';
import { accountabilityService, CheckIn } from '@/services/accountabilityService';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeAgo } from '@/utils/timeUtils';

interface CheckInHistoryProps {
  partnershipId: string | null;
  groupId: string | null;
  weekStart: string;
  partnerId: string | null;
  partnerName: string;
  partnerAvatar: string | null;
}

export const CheckInHistory = ({ 
  partnershipId,
  groupId,
  weekStart, 
  partnerId,
  partnerName,
  partnerAvatar
}: CheckInHistoryProps) => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadCheckIns = async () => {
      setLoading(true);
      const data = await accountabilityService.getCheckIns(partnershipId, groupId, weekStart);
      setCheckIns(data);
      setLoading(false);
    };

    const loadCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };

    loadCurrentUser();
    loadCheckIns();

    // Subscribe to new check-ins
    const filterCondition = partnershipId 
      ? `partnership_id=eq.${partnershipId}`
      : `group_id=eq.${groupId}`;

    const channel = supabase
      .channel('check-ins')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'accountability_check_ins',
          filter: filterCondition
        },
        (payload) => {
          const newCheckIn = payload.new as CheckIn;
          if (newCheckIn.week_start === weekStart) {
            setCheckIns(prev => [newCheckIn, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnershipId, groupId, weekStart]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Check-In Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </CardContent>
      </Card>
    );
  }

  if (checkIns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Check-In Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No check-ins this week yet. Send a message to your accountability partner!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Check-In Messages ({checkIns.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {checkIns.map((checkIn) => {
          const isFromCurrentUser = checkIn.initiated_by === currentUserId;
          
          // For groups, we need to fetch the sender's profile
          // For simplicity, we'll just show "You" or "Group Member" for now
          const displayName = isFromCurrentUser ? 'You' : (groupId ? 'Group Member' : partnerName);
          const displayAvatar = isFromCurrentUser ? null : (groupId ? null : partnerAvatar);
          
          return (
            <div
              key={checkIn.id}
              className={`flex gap-3 p-4 rounded-lg border ${
                isFromCurrentUser 
                  ? 'bg-primary/5 border-primary/20 ml-8' 
                  : 'bg-muted/50 border-border mr-8'
              }`}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={displayAvatar || undefined} />
                <AvatarFallback>{displayName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimeAgo(new Date(checkIn.created_at).getTime())}
                  </p>
                </div>
                {checkIn.message ? (
                  <p className="text-sm whitespace-pre-wrap break-words">{checkIn.message}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Checked in without a message</p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, EyeOff, History, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface VisibilityHistoryEntry {
  id: string;
  partnership_id: string;
  changed_by: string;
  field_changed: string;
  old_value: boolean | null;
  new_value: boolean;
  created_at: string;
  changer_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface VisibilityHistoryTimelineProps {
  partnershipId: string;
  partnerId: string;
  partnerName: string;
  currentUserId: string;
  user1Id: string;
  user2Id: string;
}

export const VisibilityHistoryTimeline = ({
  partnershipId,
  partnerId,
  partnerName,
  currentUserId,
  user1Id,
  user2Id,
}: VisibilityHistoryTimelineProps) => {
  const [history, setHistory] = useState<VisibilityHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('partnership_visibility_history')
          .select(`
            *,
            changer_profile:profiles!partnership_visibility_history_changed_by_fkey (
              full_name,
              avatar_url
            )
          `)
          .eq('partnership_id', partnershipId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching visibility history:', error);
          return;
        }

        setHistory((data || []) as VisibilityHistoryEntry[]);
      } catch (err) {
        console.error('Error fetching visibility history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [partnershipId]);

  const getReadableChange = (entry: VisibilityHistoryEntry): { actor: string; action: string; target: string } => {
    const isCurrentUser = entry.changed_by === currentUserId;
    const actor = isCurrentUser ? 'You' : (entry.changer_profile?.full_name?.split(' ')[0] || 'Partner');
    
    // Determine who the setting affects based on field and user positions
    const isUser1 = currentUserId === user1Id;
    const isField1 = entry.field_changed === 'user1_can_view_user2_goals';
    const isField2 = entry.field_changed === 'user2_can_view_user1_goals';
    
    let subject: string;
    let viewingWhose: string;
    
    if (isField1) {
      // user1's ability to view user2's goals
      if (isUser1) {
        subject = 'your';
        viewingWhose = `${partnerName.split(' ')[0]}'s`;
      } else {
        subject = `${partnerName.split(' ')[0]}'s`;
        viewingWhose = 'your';
      }
    } else {
      // user2's ability to view user1's goals
      if (isUser1) {
        subject = `${partnerName.split(' ')[0]}'s`;
        viewingWhose = 'your';
      } else {
        subject = 'your';
        viewingWhose = `${partnerName.split(' ')[0]}'s`;
      }
    }
    
    const action = entry.new_value ? 'enabled' : 'disabled';
    const target = `${subject} ability to view ${viewingWhose} goals`;
    
    return { actor, action, target };
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Visibility History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Visibility History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground text-sm">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No visibility changes recorded yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Visibility History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          
          {history.map((entry, index) => {
            const { actor, action, target } = getReadableChange(entry);
            const isEnabled = entry.new_value;
            
            return (
              <div key={entry.id} className="relative pl-10">
                {/* Timeline dot */}
                <div 
                  className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
                    isEnabled 
                      ? 'bg-primary border-primary' 
                      : 'bg-muted border-muted-foreground'
                  }`}
                />
                
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{actor}</span>
                        {' '}
                        <span className={isEnabled ? 'text-primary' : 'text-muted-foreground'}>
                          {action}
                        </span>
                        {' '}
                        {target}
                      </p>
                    </div>
                    <Badge 
                      variant={isEnabled ? 'default' : 'secondary'} 
                      className="flex-shrink-0 text-xs"
                    >
                      {isEnabled ? (
                        <Eye className="h-3 w-3 mr-1" />
                      ) : (
                        <EyeOff className="h-3 w-3 mr-1" />
                      )}
                      {isEnabled ? 'Visible' : 'Hidden'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(entry.created_at))} ago</span>
                    <span className="mx-1">·</span>
                    <span>{format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

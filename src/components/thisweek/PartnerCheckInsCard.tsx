import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { accountabilityService, AccountabilityPartner, CheckInRecord } from '@/services/accountabilityService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Clock, ChevronRight, ChevronDown, Users, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface PartnerCheckIn {
  partner: AccountabilityPartner;
  latestCheckIn: CheckInRecord | null;
  hasNewCheckIn: boolean; // Check-in from partner that user hasn't replied to
}

export const PartnerCheckInsCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [partnerCheckIns, setPartnerCheckIns] = useState<PartnerCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    try {
      const partners = await accountabilityService.getPartners();
      
      // Fetch latest check-in for each partner
      const checkInsPromises = partners.map(async (partner) => {
        const checkIns = await accountabilityService.getCheckInHistory(partner.partnership_id);
        const latestCheckIn = checkIns[0] || null;
        
        // Check if the latest check-in is from the partner (not the user)
        // and check if the user has replied to it
        const hasNewCheckIn = latestCheckIn 
          && latestCheckIn.initiated_by !== user.id
          && !latestCheckIn.replies?.some(r => r.initiated_by === user.id);
        
        return {
          partner,
          latestCheckIn,
          hasNewCheckIn: !!hasNewCheckIn,
        };
      });

      const results = await Promise.all(checkInsPromises);
      // Sort: new check-ins first, then by most recent
      results.sort((a, b) => {
        if (a.hasNewCheckIn && !b.hasNewCheckIn) return -1;
        if (!a.hasNewCheckIn && b.hasNewCheckIn) return 1;
        if (!a.latestCheckIn && !b.latestCheckIn) return 0;
        if (!a.latestCheckIn) return 1;
        if (!b.latestCheckIn) return -1;
        return new Date(b.latestCheckIn.created_at).getTime() - new Date(a.latestCheckIn.created_at).getTime();
      });
      
      setPartnerCheckIns(results);
      
      // Auto-expand if there are new check-ins
      const hasAnyNew = results.some(pc => pc.hasNewCheckIn);
      if (hasAnyNew) {
        setIsExpanded(true);
      }
    } catch (err) {
      console.error('Error fetching partner check-ins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Set up real-time subscription for check-ins
  useEffect(() => {
    if (!user || partnerCheckIns.length === 0) return;

    const partnershipIds = partnerCheckIns.map(pc => pc.partner.partnership_id);
    
    const channel = supabase
      .channel('partner-check-ins-card')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'accountability_check_ins',
        },
        (payload) => {
          const newCheckIn = payload.new as any;
          if (partnershipIds.includes(newCheckIn.partnership_id)) {
            // Refetch data when a new check-in is added
            fetchData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, partnerCheckIns.length]);

  const handleReply = async (partnerId: string, partnershipId: string, parentCheckInId: string) => {
    if (!replyText.trim() || !user) return;
    
    setIsSending(true);
    try {
      await accountabilityService.recordCheckIn(
        partnershipId,
        replyText.trim(),
        parentCheckInId
      );
      
      toast({
        title: "Reply sent!",
        description: "Your check-in reply has been sent.",
      });
      
      setReplyText('');
      setReplyingTo(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to send reply:', err);
      toast({
        title: "Failed to send reply",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const newCheckInsCount = useMemo(() => 
    partnerCheckIns.filter(pc => pc.hasNewCheckIn).length,
    [partnerCheckIns]
  );

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (partnerCheckIns.length === 0) {
    return null; // Don't show the card if no partners
  }

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <Card className="border-border">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Partner Check-ins
                </CardTitle>
                {newCheckInsCount > 0 && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-primary">
                    {newCheckInsCount} new
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/friends?tab=partners')}
              className="text-xs gap-1"
            >
              View All
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {partnerCheckIns.slice(0, 3).map(({ partner, latestCheckIn, hasNewCheckIn }) => (
              <div
                key={partner.partner_id}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  hasNewCheckIn ? "border-primary/30 bg-primary/5" : "border-border"
                )}
              >
                <button
                  onClick={() => navigate(`/partner/${partner.partner_id}`)}
                  className="w-full flex items-start gap-3 text-left hover:opacity-80 transition-opacity"
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={partner.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(partner.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {partner.full_name}
                      </span>
                      {hasNewCheckIn && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          New
                        </Badge>
                      )}
                    </div>
                    {latestCheckIn ? (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span className="truncate">
                            {latestCheckIn.initiated_by === user?.id ? 'You' : partner.full_name.split(' ')[0]}
                            {': '}
                            {latestCheckIn.message 
                              ? (latestCheckIn.message.length > 40 
                                  ? latestCheckIn.message.slice(0, 40) + '...' 
                                  : latestCheckIn.message)
                              : 'checked in'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-muted-foreground/70">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{formatDistanceToNow(new Date(latestCheckIn.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        No check-ins yet
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-1" />
                </button>

                {/* Inline reply section for new check-ins */}
                {hasNewCheckIn && latestCheckIn && (
                  <div className="mt-3 pt-3 border-t border-border">
                    {replyingTo === partner.partner_id ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder={`Reply to ${partner.full_name.split(' ')[0]}...`}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="min-h-[60px] text-sm"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText('');
                            }}
                            disabled={isSending}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleReply(partner.partner_id, partner.partnership_id, latestCheckIn.id)}
                            disabled={!replyText.trim() || isSending}
                            className="gap-1"
                          >
                            {isSending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            Reply
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyingTo(partner.partner_id);
                        }}
                        className="w-full text-xs"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Reply to check-in
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {partnerCheckIns.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/friends?tab=partners')}
                className="w-full text-xs text-muted-foreground"
              >
                +{partnerCheckIns.length - 3} more partners
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

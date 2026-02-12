import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { accountabilityService, AccountabilityPartner, CheckInRecord } from '@/services/accountabilityService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight, Send, Loader2, MessageSquare, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDuePartnerCheckIns } from '@/hooks/useDuePartnerCheckIns';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface MessagePreview {
  message: string;
  created_at: string;
  is_mine: boolean;
}

interface PartnerCheckIn {
  partner: AccountabilityPartner;
  latestCheckIn: CheckInRecord | null;
  hasNewMessage: boolean;
  needsCheckIn: boolean;
  recentMessages: MessagePreview[];
}

export const PartnerCheckInsCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [partnerCheckIns, setPartnerCheckIns] = useState<PartnerCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const { dueCheckIns } = useDuePartnerCheckIns();
  
  // Stabilize duePartnerIds with a string key to avoid re-render loops
  const duePartnerIdsKey = useMemo(() => dueCheckIns.map(c => c.partner_id).sort().join(','), [dueCheckIns]);
  const duePartnerIds = useMemo(() => dueCheckIns.map(c => c.partner_id), [duePartnerIdsKey]);
  
  // Track if initial fetch has happened
  const hasFetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const partners = await accountabilityService.getPartners();
      
      const checkInsPromises = partners.map(async (partner) => {
        const checkIns = await accountabilityService.getCheckInHistory(partner.partnership_id);
        const latestCheckIn = checkIns[0] || null;
        
        const hasNewMessage = latestCheckIn 
          && latestCheckIn.initiated_by !== user.id
          && !latestCheckIn.replies?.some(r => r.initiated_by === user.id);
        
        const needsCheckIn = duePartnerIds.includes(partner.partner_id);
        
        // Build recent messages from both sides
        const recentMessages: MessagePreview[] = [];
        
        // Get the last message from partner
        const partnerMessage = checkIns.find(c => c.initiated_by === partner.partner_id);
        if (partnerMessage) {
          recentMessages.push({
            message: partnerMessage.message || '',
            created_at: partnerMessage.created_at,
            is_mine: false,
          });
        }
        
        // Get the last message from me
        const myMessage = checkIns.find(c => c.initiated_by === user.id);
        if (myMessage) {
          recentMessages.push({
            message: myMessage.message || '',
            created_at: myMessage.created_at,
            is_mine: true,
          });
        }
        
        // Sort by date, oldest first (chronological chat order)
        recentMessages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        return {
          partner,
          latestCheckIn,
          hasNewMessage: !!hasNewMessage,
          needsCheckIn,
          recentMessages: recentMessages.slice(0, 2),
        };
      });

      const results = await Promise.all(checkInsPromises);
      results.sort((a, b) => {
        if (a.hasNewMessage && !b.hasNewMessage) return -1;
        if (!a.hasNewMessage && b.hasNewMessage) return 1;
        if (a.needsCheckIn && !b.needsCheckIn) return -1;
        if (!a.needsCheckIn && b.needsCheckIn) return 1;
        return 0;
      });
      
      setPartnerCheckIns(results);
    } catch (err) {
      console.error('Error fetching partner check-ins:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, duePartnerIdsKey]); // Stable dependencies only

  // Initial fetch and refetch only when user or due partners change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Use a ref for fetchData to avoid re-subscribing on every fetchData change
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;
  
  // Stabilize partnership IDs for the realtime subscription
  const partnershipIdsKey = useMemo(
    () => partnerCheckIns.map(pc => pc.partner.partnership_id).sort().join(','),
    [partnerCheckIns]
  );

  useEffect(() => {
    if (!user || !partnershipIdsKey) return;

    const partnershipIds = partnershipIdsKey.split(',');
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
    
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
            // Debounce to prevent rapid re-fetches
            if (refreshTimeout) clearTimeout(refreshTimeout);
            refreshTimeout = setTimeout(() => {
              fetchDataRef.current();
            }, 500);
          }
        }
      )
      .subscribe();

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      supabase.removeChannel(channel);
    };
  }, [user?.id, partnershipIdsKey]); // Stable string key, not array/length

  const handleSendCheckIn = async (partnerId: string, partnershipId: string, parentCheckInId?: string) => {
    if (!replyText.trim() || !user) return;
    
    setIsSending(true);
    try {
      // Add a timeout to prevent hanging forever on network issues
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 15000);
      });
      
      const result = await Promise.race([
        accountabilityService.recordCheckIn(
          partnershipId,
          replyText.trim(),
          parentCheckInId
        ),
        timeoutPromise
      ]);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send check-in');
      }
      
      toast({
        title: "Message sent!",
        description: "Your check-in has been sent.",
      });
      
      setReplyText('');
      setReplyingTo(null);
      setOpenPopover(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to send:', err);
      const message = err instanceof Error ? err.message : 'Please try again.';
      toast({
        title: "Failed to send",
        description: message.includes('timeout') 
          ? "Connection is slow. Please check your network and try again." 
          : message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkAsRead = async (partnershipId: string, checkInId: string) => {
    setIsSending(true);
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 15000);
      });
      
      const result = await Promise.race([
        accountabilityService.recordCheckIn(
          partnershipId,
          '👀', // Read acknowledgment
          checkInId
        ),
        timeoutPromise
      ]);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to mark as read');
      }
      
      toast({
        title: "Marked as read",
      });
      
      setOpenPopover(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to mark as read:', err);
      toast({
        title: "Failed to mark as read",
        description: err instanceof Error && err.message.includes('timeout') 
          ? "Connection is slow. Please try again." 
          : undefined,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const actionCount = useMemo(() => {
    const newMessages = partnerCheckIns.filter(pc => pc.hasNewMessage).length;
    const needsCheckIn = partnerCheckIns.filter(pc => pc.needsCheckIn && !pc.hasNewMessage).length;
    return newMessages + needsCheckIn;
  }, [partnerCheckIns]);

  if (loading || partnerCheckIns.length === 0) {
    return null;
  }

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex items-center gap-2">
        <div className="flex -space-x-1.5">
          {partnerCheckIns.map(({ partner, hasNewMessage, needsCheckIn, latestCheckIn, recentMessages }) => {
            const status = hasNewMessage ? 'new-message' : needsCheckIn ? 'needs-checkin' : 'none';
            
            return (
              <Popover 
                key={partner.partner_id} 
                open={openPopover === partner.partner_id}
                onOpenChange={(open) => {
                  setOpenPopover(open ? partner.partner_id : null);
                  if (!open) {
                    setReplyingTo(null);
                    setReplyText('');
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    className="relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded-full"
                  >
                    <Avatar 
                      className={cn(
                        "h-7 w-7 border-2 border-background transition-all cursor-pointer",
                        status === 'new-message' && "ring-2 ring-primary",
                        status === 'needs-checkin' && "ring-2 ring-amber-500/50",
                        status === 'none' && "opacity-60 hover:opacity-100"
                      )}
                    >
                      <AvatarImage src={partner.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {getInitials(partner.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    {status === 'new-message' && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary border border-background" />
                    )}
                    {status === 'needs-checkin' && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500 border border-background" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarImage src={partner.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(partner.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium text-sm">{partner.full_name}</p>
                      </div>
                      {needsCheckIn && !hasNewMessage && (
                        <span className="text-[10px] text-amber-500 font-medium">Check-in due</span>
                      )}
                    </div>
                    
                    {/* Message history */}
                    {recentMessages.length > 0 ? (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {recentMessages.map((msg, idx) => (
                          <div 
                            key={idx} 
                            className={cn(
                              "text-xs p-2 rounded-lg",
                              msg.is_mine 
                                ? "bg-primary/10 ml-4" 
                                : "bg-muted mr-4"
                            )}
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-medium text-[10px]">
                                {msg.is_mine ? 'You' : partner.full_name.split(' ')[0]}
                              </span>
                              <span className="text-muted-foreground/60 text-[9px]">
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-muted-foreground line-clamp-2">{msg.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No messages yet
                      </p>
                    )}
                    
                    {replyingTo === partner.partner_id ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Write a message..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="min-h-[60px] text-sm resize-none"
                          autoFocus
                        />
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
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
                            className="h-7 text-xs gap-1"
                            onClick={() => handleSendCheckIn(
                              partner.partner_id, 
                              partner.partnership_id, 
                              hasNewMessage && latestCheckIn ? latestCheckIn.id : undefined
                            )}
                            disabled={!replyText.trim() || isSending}
                          >
                            {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            Send
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 text-xs"
                          onClick={() => setReplyingTo(partner.partner_id)}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {hasNewMessage ? 'Reply' : 'Check in'}
                        </Button>
                        {hasNewMessage && latestCheckIn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleMarkAsRead(partner.partnership_id, latestCheckIn.id)}
                            disabled={isSending}
                          >
                            {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-0.5" />}
                            Read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setOpenPopover(null);
                            navigate(`/partner/${partner.partner_id}`);
                          }}
                        >
                          View
                          <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>

        {actionCount > 0 && (
          <Badge variant="default" className="text-[10px] px-1.5 h-5 bg-primary">
            {actionCount}
          </Badge>
        )}
      </div>

      <button
        onClick={() => navigate('/friends?tab=partners')}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5 ml-auto"
      >
        All partners
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
};

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { accountabilityService, AccountabilityPartner, CheckInRecord } from '@/services/accountabilityService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight, Send, Loader2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDuePartnerCheckIns } from '@/hooks/useDuePartnerCheckIns';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface PartnerCheckIn {
  partner: AccountabilityPartner;
  latestCheckIn: CheckInRecord | null;
  hasNewMessage: boolean;
  needsCheckIn: boolean;
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
  const duePartnerIds = dueCheckIns.map(c => c.partner_id);

  const fetchData = async () => {
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
        
        return {
          partner,
          latestCheckIn,
          hasNewMessage: !!hasNewMessage,
          needsCheckIn,
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
  };

  useEffect(() => {
    fetchData();
  }, [user, duePartnerIds]);

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
            fetchData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, partnerCheckIns.length]);

  const handleSendCheckIn = async (partnerId: string, partnershipId: string, parentCheckInId?: string) => {
    if (!replyText.trim() || !user) return;
    
    setIsSending(true);
    try {
      await accountabilityService.recordCheckIn(
        partnershipId,
        replyText.trim(),
        parentCheckInId
      );
      
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
      toast({
        title: "Failed to send",
        description: "Please try again.",
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
          {partnerCheckIns.map(({ partner, hasNewMessage, needsCheckIn, latestCheckIn }) => {
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
                <PopoverContent className="w-72 p-3" align="start">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={partner.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(partner.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{partner.full_name}</p>
                        {hasNewMessage && latestCheckIn && (
                          <>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              "{latestCheckIn.message}"
                            </p>
                            <p className="text-[10px] text-muted-foreground/70 mt-1">
                              {formatDistanceToNow(new Date(latestCheckIn.created_at), { addSuffix: true })}
                            </p>
                          </>
                        )}
                        {needsCheckIn && !hasNewMessage && (
                          <p className="text-xs text-amber-500 mt-0.5">Check-in due</p>
                        )}
                        {!hasNewMessage && !needsCheckIn && (
                          <p className="text-xs text-muted-foreground mt-0.5">No action needed</p>
                        )}
                      </div>
                    </div>
                    
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

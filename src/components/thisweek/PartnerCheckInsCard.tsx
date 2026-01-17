import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { accountabilityService, AccountabilityPartner, CheckInRecord } from '@/services/accountabilityService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Send, Loader2, ChevronRight, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface PartnerCheckIn {
  partner: AccountabilityPartner;
  latestCheckIn: CheckInRecord | null;
  hasNewCheckIn: boolean;
}

export const PartnerCheckInsCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [partnerCheckIns, setPartnerCheckIns] = useState<PartnerCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    try {
      const partners = await accountabilityService.getPartners();
      
      const checkInsPromises = partners.map(async (partner) => {
        const checkIns = await accountabilityService.getCheckInHistory(partner.partnership_id);
        const latestCheckIn = checkIns[0] || null;
        
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
      results.sort((a, b) => {
        if (a.hasNewCheckIn && !b.hasNewCheckIn) return -1;
        if (!a.hasNewCheckIn && b.hasNewCheckIn) return 1;
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
  }, [user]);

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

  const partnersWithNew = partnerCheckIns.filter(pc => pc.hasNewCheckIn);

  if (loading || partnerCheckIns.length === 0) {
    return null;
  }

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  // If no new check-ins, show minimal link
  if (newCheckInsCount === 0) {
    return (
      <button
        onClick={() => navigate('/friends?tab=partners')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        <div className="flex -space-x-2">
          {partnerCheckIns.slice(0, 3).map(({ partner }) => (
            <Avatar key={partner.partner_id} className="h-6 w-6 border-2 border-background">
              <AvatarImage src={partner.avatar_url || undefined} />
              <AvatarFallback className="text-[10px] bg-muted">
                {getInitials(partner.full_name)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <span>{partnerCheckIns.length} partner{partnerCheckIns.length !== 1 ? 's' : ''}</span>
        <ChevronRight className="h-3 w-3" />
      </button>
    );
  }

  // If there are new check-ins, show compact interactive section
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex items-center gap-2">
        <div className="flex -space-x-1.5">
          {partnersWithNew.slice(0, 4).map(({ partner, latestCheckIn }) => (
            <Popover key={partner.partner_id}>
              <PopoverTrigger asChild>
                <button className="relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full">
                  <Avatar className="h-8 w-8 border-2 border-background ring-2 ring-primary/20 hover:ring-primary/50 transition-all cursor-pointer">
                    <AvatarImage src={partner.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(partner.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
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
                      {latestCheckIn && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          "{latestCheckIn.message?.slice(0, 60)}{latestCheckIn.message && latestCheckIn.message.length > 60 ? '...' : ''}"
                        </p>
                      )}
                      {latestCheckIn && (
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(latestCheckIn.created_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {replyingTo === partner.partner_id ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Quick reply..."
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
                          onClick={() => latestCheckIn && handleReply(partner.partner_id, partner.partnership_id, latestCheckIn.id)}
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
                        Reply
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => navigate(`/partner/${partner.partner_id}`)}
                      >
                        View
                        <ChevronRight className="h-3 w-3 ml-0.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ))}
        </div>
        
        {partnersWithNew.length > 0 && (
          <Badge variant="default" className="text-[10px] px-1.5 h-5 bg-primary">
            {newCheckInsCount} new
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
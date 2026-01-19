import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { accountabilityService, AccountabilityPartner, CheckInRecord } from '@/services/accountabilityService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDuePartnerCheckIns } from '@/hooks/useDuePartnerCheckIns';

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
  const { dueCheckIns } = useDuePartnerCheckIns();
  const duePartnerIds = dueCheckIns.map(c => c.partner_id);

  const fetchData = async () => {
    if (!user) return;

    try {
      const partners = await accountabilityService.getPartners();
      
      const checkInsPromises = partners.map(async (partner) => {
        const checkIns = await accountabilityService.getCheckInHistory(partner.partnership_id);
        const latestCheckIn = checkIns[0] || null;
        
        // Has new message: partner sent a check-in that I haven't replied to
        const hasNewMessage = latestCheckIn 
          && latestCheckIn.initiated_by !== user.id
          && !latestCheckIn.replies?.some(r => r.initiated_by === user.id);
        
        // Needs check-in: based on cadence/due dates
        const needsCheckIn = duePartnerIds.includes(partner.partner_id);
        
        return {
          partner,
          latestCheckIn,
          hasNewMessage: !!hasNewMessage,
          needsCheckIn,
        };
      });

      const results = await Promise.all(checkInsPromises);
      // Sort: new messages first, then needs check-in, then others
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

  if (loading || partnerCheckIns.length === 0) {
    return null;
  }

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex -space-x-1.5">
        {partnerCheckIns.map(({ partner, hasNewMessage, needsCheckIn }) => {
          const status = hasNewMessage ? 'new-message' : needsCheckIn ? 'needs-checkin' : 'none';
          
          return (
            <Tooltip key={partner.partner_id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate(`/partner/${partner.partner_id}`)}
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
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">{partner.full_name}</p>
                {hasNewMessage && <p className="text-primary">New message</p>}
                {needsCheckIn && !hasNewMessage && <p className="text-amber-500">Check-in due</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}
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

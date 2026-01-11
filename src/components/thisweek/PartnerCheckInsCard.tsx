import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { accountabilityService, AccountabilityPartner, CheckInRecord } from '@/services/accountabilityService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Clock, ChevronRight, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface PartnerCheckIn {
  partner: AccountabilityPartner;
  latestCheckIn: CheckInRecord | null;
}

export const PartnerCheckInsCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [partnerCheckIns, setPartnerCheckIns] = useState<PartnerCheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const partners = await accountabilityService.getPartners();
        
        // Fetch latest check-in for each partner
        const checkInsPromises = partners.map(async (partner) => {
          const checkIns = await accountabilityService.getCheckInHistory(partner.partnership_id);
          return {
            partner,
            latestCheckIn: checkIns[0] || null,
          };
        });

        const results = await Promise.all(checkInsPromises);
        // Sort by most recent check-in first
        results.sort((a, b) => {
          if (!a.latestCheckIn && !b.latestCheckIn) return 0;
          if (!a.latestCheckIn) return 1;
          if (!b.latestCheckIn) return -1;
          return new Date(b.latestCheckIn.created_at).getTime() - new Date(a.latestCheckIn.created_at).getTime();
        });
        
        setPartnerCheckIns(results);
      } catch (err) {
        console.error('Error fetching partner check-ins:', err);
      } finally {
        setLoading(false);
      }
    };

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
            setLoading(true);
            accountabilityService.getPartners().then(async (partners) => {
              const checkInsPromises = partners.map(async (partner) => {
                const checkIns = await accountabilityService.getCheckInHistory(partner.partnership_id);
                return {
                  partner,
                  latestCheckIn: checkIns[0] || null,
                };
              });
              const results = await Promise.all(checkInsPromises);
              results.sort((a, b) => {
                if (!a.latestCheckIn && !b.latestCheckIn) return 0;
                if (!a.latestCheckIn) return 1;
                if (!b.latestCheckIn) return -1;
                return new Date(b.latestCheckIn.created_at).getTime() - new Date(a.latestCheckIn.created_at).getTime();
              });
              setPartnerCheckIns(results);
              setLoading(false);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, partnerCheckIns.length]);

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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Partner Check-ins
          </CardTitle>
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
      <CardContent className="space-y-3">
        {partnerCheckIns.slice(0, 3).map(({ partner, latestCheckIn }) => (
          <button
            key={partner.partner_id}
            onClick={() => navigate(`/partner/${partner.partner_id}`)}
            className="w-full flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
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
                {latestCheckIn && latestCheckIn.initiated_by !== user?.id && (
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
    </Card>
  );
};

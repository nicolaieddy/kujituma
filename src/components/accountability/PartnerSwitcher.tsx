import { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { accountabilityService, AccountabilityPartner } from '@/services/accountabilityService';
import { Check, AlertCircle } from 'lucide-react';
import { startOfWeek, isAfter, parseISO } from 'date-fns';

export interface PartnerSwitcherRef {
  refresh: () => Promise<void>;
}

interface PartnerSwitcherProps {
  currentPartnerId: string;
}

export const PartnerSwitcher = forwardRef<PartnerSwitcherRef, PartnerSwitcherProps>(({ currentPartnerId }, ref) => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<AccountabilityPartner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPartners = useCallback(async () => {
    try {
      const data = await accountabilityService.getPartners();
      setPartners(data);
    } catch (err) {
      console.error('Failed to fetch partners:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: fetchPartners
  }), [fetchPartners]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  if (loading || partners.length <= 1) {
    return null;
  }

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const hasCheckedInThisWeek = (lastCheckIn: string | null): boolean => {
    if (!lastCheckIn) return false;
    const checkInDate = parseISO(lastCheckIn);
    return isAfter(checkInDate, currentWeekStart) || checkInDate >= currentWeekStart;
  };

  return (
    <div className="mb-4">
      <p className="text-xs text-muted-foreground mb-2">Switch Partner</p>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-2">
          {partners.map((partner) => {
            const isCurrent = partner.partner_id === currentPartnerId;
            const checkedIn = hasCheckedInThisWeek(partner.last_check_in_at);
            const initials = partner.full_name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <button
                key={partner.partner_id}
                onClick={() => {
                  if (!isCurrent) {
                    navigate(`/partner/${partner.partner_id}`);
                  }
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors min-w-[72px]",
                  isCurrent 
                    ? "bg-primary/10 ring-2 ring-primary" 
                    : "hover:bg-muted"
                )}
              >
                <div className="relative">
                  <Avatar className={cn(
                    "h-12 w-12 border-2",
                    isCurrent ? "border-primary" : "border-transparent"
                  )}>
                    <AvatarImage src={partner.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {/* Check-in status indicator */}
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full flex items-center justify-center border-2 border-background",
                    checkedIn 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-warning text-warning-foreground"
                  )}>
                    {checkedIn ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                  </div>
                </div>
                <span className={cn(
                  "text-xs truncate max-w-[64px]",
                  isCurrent ? "font-medium text-primary" : "text-muted-foreground"
                )}>
                  {partner.full_name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
});

PartnerSwitcher.displayName = 'PartnerSwitcher';

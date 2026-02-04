import { useCallback, useImperativeHandle, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAccountabilityData } from '@/hooks/useAccountabilityData';
import { AccountabilityPartner } from '@/services/accountabilityService';
import { Check, AlertCircle, Ban } from 'lucide-react';
import { startOfWeek, isAfter, parseISO } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CheckInCadence } from '@/services/accountabilityService';

export interface PartnerSwitcherRef {
  refresh: () => Promise<void>;
}

interface PartnerSwitcherProps {
  currentPartnerId: string;
}

type CheckInStatus = 'checked-in' | 'needs-check-in' | 'disabled';

export const PartnerSwitcher = forwardRef<PartnerSwitcherRef, PartnerSwitcherProps>(({ currentPartnerId }, ref) => {
  const navigate = useNavigate();
  
  // Use the consolidated hook - shares cache with other accountability components
  const { partners, isLoading, refetch } = useAccountabilityData();

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useImperativeHandle(ref, () => ({
    refresh: handleRefresh
  }), [handleRefresh]);

  if (isLoading || partners.length <= 1) {
    return null;
  }

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  // Determine the check-in status for a partner
  const getCheckInStatus = (partner: AccountabilityPartner): CheckInStatus => {
    // If cadence is 'none', check-ins are disabled
    if (partner.my_check_in_cadence === 'none') {
      return 'disabled';
    }
    
    // Check if checked in this week
    if (partner.my_last_check_in_at) {
      const checkInDate = parseISO(partner.my_last_check_in_at);
      if (isAfter(checkInDate, currentWeekStart) || checkInDate >= currentWeekStart) {
        return 'checked-in';
      }
    }
    
    return 'needs-check-in';
  };

  const getStatusConfig = (status: CheckInStatus) => {
    switch (status) {
      case 'checked-in':
        return {
          bgClass: 'bg-primary text-primary-foreground',
          icon: Check,
          tooltip: 'Checked in this week'
        };
      case 'needs-check-in':
        return {
          bgClass: 'bg-warning text-warning-foreground',
          icon: AlertCircle,
          tooltip: 'Check-in needed'
        };
      case 'disabled':
        return {
          bgClass: 'bg-muted text-muted-foreground',
          icon: Ban,
          tooltip: 'Check-ins disabled'
        };
    }
  };

  return (
    <div className="mb-4">
      <p className="text-xs text-muted-foreground mb-2">Switch Partner</p>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 py-1 px-1">
          {partners.map((partner) => {
            const isCurrent = partner.partner_id === currentPartnerId;
            const status = getCheckInStatus(partner);
            const statusConfig = getStatusConfig(status);
            const StatusIcon = statusConfig.icon;
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
                  "flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all min-w-[72px]",
                  isCurrent 
                    ? "bg-primary/10 border-2 border-primary" 
                    : "hover:bg-muted border-2 border-transparent"
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full flex items-center justify-center border-2 border-background",
                        statusConfig.bgClass
                      )}>
                        <StatusIcon className="h-3 w-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{statusConfig.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
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

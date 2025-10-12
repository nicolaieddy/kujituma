import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCheck, MessageSquare, Pause, Play, UserX } from 'lucide-react';
import { AccountabilityPartner } from '@/services/accountabilityService';
import { CheckInDialog } from './CheckInDialog';
import { formatTimeAgo } from '@/utils/timeUtils';

interface AccountabilityPartnerCardProps {
  partner: AccountabilityPartner;
  weekStart: string;
  onStatusChange: () => void;
}

export const AccountabilityPartnerCard = ({ partner, weekStart, onStatusChange }: AccountabilityPartnerCardProps) => {
  const [showCheckIn, setShowCheckIn] = useState(false);

  return (
    <>
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCheck className="h-5 w-5 text-primary" />
            Your Accountability Partner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={partner.avatar_url || undefined} />
              <AvatarFallback>{partner.full_name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{partner.full_name}</p>
              {partner.last_check_in_at && (
                <p className="text-xs text-muted-foreground">
                  Last check-in: {formatTimeAgo(new Date(partner.last_check_in_at).getTime())}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowCheckIn(true)}
              className="flex-1 gap-2"
              size="sm"
            >
              <MessageSquare className="h-4 w-4" />
              Check In
            </Button>
          </div>
        </CardContent>
      </Card>

      <CheckInDialog
        open={showCheckIn}
        onOpenChange={setShowCheckIn}
        partner={partner}
        weekStart={weekStart}
        onCheckInComplete={onStatusChange}
      />
    </>
  );
};

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, Users, UserCheck, MessageSquare } from 'lucide-react';
import { 
  AccountabilityPartner, 
  AccountabilityGroup,
  accountabilityService 
} from '@/services/accountabilityService';
import { CheckInDialog } from './CheckInDialog';
import { CheckInHistory } from './CheckInHistory';
import { PartnerProgressView } from './PartnerProgressView';
import { formatTimeAgo } from '@/utils/timeUtils';

interface AccountabilitySectionProps {
  weekStart: string;
  onUpdate: () => void;
}

export const AccountabilitySection = ({ weekStart, onUpdate }: AccountabilitySectionProps) => {
  const [partners, setPartners] = useState<AccountabilityPartner[]>([]);
  const [groups, setGroups] = useState<AccountabilityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [showCheckIn, setShowCheckIn] = useState<{
    type: 'partner' | 'group';
    id: string;
    name: string;
    avatar?: string | null;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [partnersData, groupsData] = await Promise.all([
      accountabilityService.getAccountabilityPartners(),
      accountabilityService.getAccountabilityGroups(),
    ]);
    setPartners(partnersData);
    setGroups(groupsData);
    setLoading(false);
  };

  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Loading accountability...</p>
        </CardContent>
      </Card>
    );
  }

  if (partners.length === 0 && groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <UserCheck className="h-5 w-5 text-primary" />
        Accountability
      </h3>

      {/* Partners */}
      {partners.map((partner) => {
        const isOpen = openItems.has(`partner-${partner.partnership_id}`);
        return (
          <Collapsible
            key={partner.partnership_id}
            open={isOpen}
            onOpenChange={() => toggleItem(`partner-${partner.partnership_id}`)}
          >
            <Card className="border-primary/30">
              <CollapsibleTrigger className="w-full">
                <CardContent className="pt-6 pb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={partner.avatar_url || undefined} />
                      <AvatarFallback>{partner.full_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{partner.full_name}</p>
                        <Badge variant="secondary" className="text-xs">Partner</Badge>
                      </div>
                      {partner.last_check_in_at && (
                        <p className="text-xs text-muted-foreground">
                          Last check-in: {formatTimeAgo(new Date(partner.last_check_in_at).getTime())}
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </CardContent>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <Button
                    onClick={() => setShowCheckIn({
                      type: 'partner',
                      id: partner.partnership_id,
                      name: partner.full_name,
                      avatar: partner.avatar_url
                    })}
                    className="w-full gap-2"
                    size="sm"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Send Check-In
                  </Button>

                  <CheckInHistory
                    partnershipId={partner.partnership_id}
                    groupId={null}
                    weekStart={weekStart}
                    partnerId={partner.partner_id}
                    partnerName={partner.full_name}
                    partnerAvatar={partner.avatar_url}
                  />

                  <PartnerProgressView
                    partnerId={partner.partner_id}
                    weekStart={weekStart}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {/* Groups */}
      {groups.map((group) => {
        const isOpen = openItems.has(`group-${group.group_id}`);
        return (
          <Collapsible
            key={group.group_id}
            open={isOpen}
            onOpenChange={() => toggleItem(`group-${group.group_id}`)}
          >
            <Card className="border-primary/30">
              <CollapsibleTrigger className="w-full">
                <CardContent className="pt-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{group.group_name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {group.member_count} members
                        </Badge>
                      </div>
                      {group.last_check_in_at && (
                        <p className="text-xs text-muted-foreground">
                          Last activity: {formatTimeAgo(new Date(group.last_check_in_at).getTime())}
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </CardContent>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  {group.group_description && (
                    <p className="text-sm text-muted-foreground">{group.group_description}</p>
                  )}

                  <Button
                    onClick={() => setShowCheckIn({
                      type: 'group',
                      id: group.group_id,
                      name: group.group_name
                    })}
                    className="w-full gap-2"
                    size="sm"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Send Group Check-In
                  </Button>

                  <CheckInHistory
                    partnershipId={null}
                    groupId={group.group_id}
                    weekStart={weekStart}
                    partnerId={null}
                    partnerName={group.group_name}
                    partnerAvatar={null}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {showCheckIn && (
        <CheckInDialog
          open={!!showCheckIn}
          onOpenChange={(open) => !open && setShowCheckIn(null)}
          partner={showCheckIn.type === 'partner' ? {
            partner_id: '',
            partnership_id: showCheckIn.id,
            full_name: showCheckIn.name,
            avatar_url: showCheckIn.avatar || null,
            status: 'active',
            last_check_in_at: null
          } : null}
          groupId={showCheckIn.type === 'group' ? showCheckIn.id : null}
          groupName={showCheckIn.type === 'group' ? showCheckIn.name : undefined}
          weekStart={weekStart}
          onCheckInComplete={() => {
            loadData();
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

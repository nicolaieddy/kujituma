import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PartnerCard } from './PartnerCard';
import { InvitePartnerModal } from './InvitePartnerModal';
import { UserPlus, Handshake } from 'lucide-react';
import { AccountabilityPartner } from '@/services/accountabilityService';
import { EmptyState } from '@/components/ui/empty-state';
import { PeopleEmpty } from '@/components/illustrations';

interface PartnersListSectionProps {
  partners: AccountabilityPartner[];
  onRemove: (partnerId: string) => Promise<void>;
  onCheckIn: (partnershipId: string) => Promise<void>;
  onVisibilityChange: () => void;
  onInvite: (
    userId: string, 
    message: string,
    visibilitySettings: { senderCanViewReceiverGoals: boolean; receiverCanViewSenderGoals: boolean }
  ) => Promise<{ success: boolean }>;
  loading?: boolean;
}

export const PartnersListSection = ({
  partners,
  onRemove,
  onCheckIn,
  onVisibilityChange,
  onInvite,
  loading
}: PartnersListSectionProps) => {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  return (
    <>
      <Card className="border-border hover:border-primary/20 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Handshake className="h-5 w-5" />
              Your Partners ({partners.length})
            </CardTitle>
          </div>
          <Button onClick={() => setInviteModalOpen(true)} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Partner
          </Button>
        </CardHeader>
        <CardContent>
          {partners.length === 0 ? (
            <EmptyState
              illustration={<PeopleEmpty />}
              title="No accountability partners yet"
              description="Invite a trusted friend or executive assistant to help keep you on track with your goals."
              actions={
                <Button onClick={() => setInviteModalOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite your first partner
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {partners.map((partner) => (
                <PartnerCard
                  key={partner.partner_id}
                  partner={partner}
                  onRemove={onRemove}
                  onCheckIn={onCheckIn}
                  onVisibilityChange={onVisibilityChange}
                  loading={loading}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <InvitePartnerModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        onInvite={onInvite}
        existingPartners={partners}
      />
    </>
  );
};

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PartnerCard } from './PartnerCard';
import { InvitePartnerModal } from './InvitePartnerModal';
import { UserPlus, Handshake } from 'lucide-react';
import { AccountabilityPartner } from '@/services/accountabilityService';

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
            <div className="text-center py-12 space-y-4">
              <div className="relative inline-block">
                <Handshake className="h-16 w-16 mx-auto text-muted-foreground" />
              </div>
              <div>
                <p className="text-foreground font-medium mb-2">No accountability partners yet</p>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Invite a trusted friend or executive assistant to help keep you on track with your goals.
                </p>
              </div>
              <Button onClick={() => setInviteModalOpen(true)} className="mt-4">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Your First Partner
              </Button>
            </div>
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

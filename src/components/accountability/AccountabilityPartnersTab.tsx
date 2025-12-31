import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccountabilityPartners } from '@/hooks/useAccountabilityPartners';
import { PartnerCard } from './PartnerCard';
import { PartnerRequestCard } from './PartnerRequestCard';
import { InvitePartnerModal } from './InvitePartnerModal';
import { AcceptPartnerDialog } from './AcceptPartnerDialog';
import { Users, UserPlus, Inbox, Handshake } from 'lucide-react';
import { AccountabilityPartnerRequest } from '@/services/accountabilityService';

export const AccountabilityPartnersTab = () => {
  const { 
    partners, 
    partnerRequests, 
    loading, 
    sendPartnerRequest,
    respondToPartnerRequest,
    removePartner,
    recordCheckIn,
    refetch
  } = useAccountabilityPartners();
  
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AccountabilityPartnerRequest | null>(null);

  const handleOpenAcceptDialog = (request: AccountabilityPartnerRequest) => {
    setSelectedRequest(request);
    setAcceptDialogOpen(true);
  };

  const handleAcceptRequest = async (
    requestId: string, 
    visibilitySettings: { senderCanViewReceiverGoals: boolean; receiverCanViewSenderGoals: boolean }
  ) => {
    await respondToPartnerRequest(requestId, 'accepted', visibilitySettings);
  };

  const handleRejectRequest = async (requestId: string) => {
    await respondToPartnerRequest(requestId, 'rejected');
  };

  const handleCancelRequest = async (requestId: string) => {
    await respondToPartnerRequest(requestId, 'rejected');
  };

  const handleRemovePartner = async (partnerId: string) => {
    await removePartner(partnerId);
  };

  const handleCheckIn = async (partnershipId: string) => {
    await recordCheckIn(partnershipId);
  };

  const handleInvite = async (
    userId: string, 
    message: string,
    visibilitySettings: { senderCanViewReceiverGoals: boolean; receiverCanViewSenderGoals: boolean }
  ) => {
    return await sendPartnerRequest(userId, message, visibilitySettings);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  const hasRequests = partnerRequests.received.length > 0 || partnerRequests.sent.length > 0;

  return (
    <div className="space-y-6">
      {/* Partners Section */}
      <Card className="border-border hover:border-primary/20 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Accountability Partners ({partners.length})
          </CardTitle>
          <Button onClick={() => setInviteModalOpen(true)} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Partner
          </Button>
        </CardHeader>
        <CardContent>
          {partners.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="relative inline-block">
                <Handshake className="h-16 w-16 mx-auto text-muted-foreground animate-pulse" />
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary/10 animate-ping" />
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
                  onRemove={handleRemovePartner}
                  onCheckIn={handleCheckIn}
                  onVisibilityChange={refetch}
                  loading={loading}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Requests Section */}
      {hasRequests && (
        <>
          {/* Received Requests */}
          {partnerRequests.received.length > 0 && (
            <Card className="border-border hover:border-primary/20 transition-colors">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Inbox className="h-5 w-5" />
                  Received Requests ({partnerRequests.received.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {partnerRequests.received.map((request) => (
                    <PartnerRequestCard
                      key={request.id}
                      request={request}
                      type="received"
                      onAccept={() => handleOpenAcceptDialog(request)}
                      onReject={handleRejectRequest}
                      loading={loading}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sent Requests */}
          {partnerRequests.sent.length > 0 && (
            <Card className="border-border hover:border-primary/20 transition-colors">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Sent Requests ({partnerRequests.sent.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {partnerRequests.sent.map((request) => (
                    <PartnerRequestCard
                      key={request.id}
                      request={request}
                      type="sent"
                      onCancel={handleCancelRequest}
                      loading={loading}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <InvitePartnerModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        onInvite={handleInvite}
        existingPartners={partners}
      />

      <AcceptPartnerDialog
        open={acceptDialogOpen}
        onOpenChange={setAcceptDialogOpen}
        request={selectedRequest}
        onAccept={handleAcceptRequest}
        loading={loading}
      />
    </div>
  );
};

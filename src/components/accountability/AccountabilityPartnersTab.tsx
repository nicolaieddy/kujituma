import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAccountabilityPartners } from '@/hooks/useAccountabilityPartners';
import { PartnersListSection } from './PartnersListSection';
import { PartnerRequestsSection } from './PartnerRequestsSection';
import { Info } from 'lucide-react';

export const AccountabilityPartnersTab = () => {
  const { 
    partners, 
    partnerRequests, 
    loading, 
    sendPartnerRequest,
    respondToPartnerRequest,
    removePartner,
    cancelPartnerRequest,
    recordCheckIn,
    refetch
  } = useAccountabilityPartners();

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
    await cancelPartnerRequest(requestId);
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

  return (
    <div className="space-y-6">
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Accountability Partners</strong> are trusted people who help keep you on track with your goals. 
          Unlike regular friends, partners can optionally view each other's goals and progress, check in regularly, 
          and provide mutual support. Great for executive assistants, coaches, or close friends who want to help you succeed.
        </AlertDescription>
      </Alert>

      <PartnersListSection
        partners={partners}
        onRemove={handleRemovePartner}
        onCheckIn={handleCheckIn}
        onVisibilityChange={refetch}
        onInvite={handleInvite}
        loading={loading}
      />

      <PartnerRequestsSection
        receivedRequests={partnerRequests.received}
        sentRequests={partnerRequests.sent}
        onAccept={handleAcceptRequest}
        onReject={handleRejectRequest}
        onCancel={handleCancelRequest}
        loading={loading}
      />
    </div>
  );
};

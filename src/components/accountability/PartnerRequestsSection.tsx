import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PartnerRequestCard } from './PartnerRequestCard';
import { AcceptPartnerDialog } from './AcceptPartnerDialog';
import { Inbox, UserPlus } from 'lucide-react';
import { AccountabilityPartnerRequest } from '@/services/accountabilityService';

interface PartnerRequestsSectionProps {
  receivedRequests: AccountabilityPartnerRequest[];
  sentRequests: AccountabilityPartnerRequest[];
  onAccept: (
    requestId: string, 
    visibilitySettings: { senderCanViewReceiverGoals: boolean; receiverCanViewSenderGoals: boolean }
  ) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
  onCancel: (requestId: string) => Promise<void>;
  loading?: boolean;
}

export const PartnerRequestsSection = ({
  receivedRequests,
  sentRequests,
  onAccept,
  onReject,
  onCancel,
  loading
}: PartnerRequestsSectionProps) => {
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AccountabilityPartnerRequest | null>(null);

  const handleOpenAcceptDialog = (request: AccountabilityPartnerRequest) => {
    setSelectedRequest(request);
    setAcceptDialogOpen(true);
  };

  const hasReceivedRequests = receivedRequests.length > 0;
  const hasSentRequests = sentRequests.length > 0;

  if (!hasReceivedRequests && !hasSentRequests) {
    return null;
  }

  return (
    <>
      {hasReceivedRequests && (
        <Card className="border-border hover:border-primary/20 transition-colors">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Received Requests ({receivedRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {receivedRequests.map((request) => (
                <PartnerRequestCard
                  key={request.id}
                  request={request}
                  type="received"
                  onAccept={() => handleOpenAcceptDialog(request)}
                  onReject={onReject}
                  loading={loading}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasSentRequests && (
        <Card className="border-border hover:border-primary/20 transition-colors">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Sent Requests ({sentRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sentRequests.map((request) => (
                <PartnerRequestCard
                  key={request.id}
                  request={request}
                  type="sent"
                  onCancel={onCancel}
                  loading={loading}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AcceptPartnerDialog
        open={acceptDialogOpen}
        onOpenChange={setAcceptDialogOpen}
        request={selectedRequest}
        onAccept={onAccept}
        loading={loading}
      />
    </>
  );
};

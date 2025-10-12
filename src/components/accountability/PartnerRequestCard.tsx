import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X } from 'lucide-react';
import { AccountabilityPartnerRequest, accountabilityService } from '@/services/accountabilityService';
import { toast } from 'sonner';
import { formatTimeAgo } from '@/utils/timeUtils';

interface PartnerRequestCardProps {
  request: AccountabilityPartnerRequest;
  onResponse: () => void;
}

export const PartnerRequestCard = ({ request, onResponse }: PartnerRequestCardProps) => {
  const handleRespond = async (response: 'accepted' | 'rejected') => {
    const result = await accountabilityService.respondToPartnerRequest(request.id, response);

    if (result.success) {
      toast.success(
        response === 'accepted'
          ? `🤝 You're now accountability partners with ${request.sender?.full_name}!`
          : 'Request declined'
      );
      onResponse();
    } else {
      toast.error(result.error || 'Failed to respond to request');
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar>
            <AvatarImage src={request.sender?.avatar_url || undefined} />
            <AvatarFallback>{request.sender?.full_name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{request.sender?.full_name}</p>
            <p className="text-sm text-muted-foreground">
              Wants to be your accountability partner
            </p>
            {request.message && (
              <p className="text-sm mt-1 italic text-muted-foreground">
                "{request.message}"
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formatTimeAgo(new Date(request.created_at).getTime())}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRespond('rejected')}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => handleRespond('accepted')}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

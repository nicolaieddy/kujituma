import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AccountabilityPartnerRequest } from '@/services/accountabilityService';
import { Check, X, Clock, Eye, EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PartnerRequestCardProps {
  request: AccountabilityPartnerRequest;
  type: 'sent' | 'received';
  onAccept?: (requestId: string) => void | Promise<void>;
  onReject?: (requestId: string) => Promise<void>;
  onCancel?: (requestId: string) => Promise<void>;
  loading?: boolean;
}

export const PartnerRequestCard = ({ 
  request, 
  type, 
  onAccept, 
  onReject, 
  onCancel,
  loading 
}: PartnerRequestCardProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const profile = type === 'sent' ? request.receiver_profile : request.sender_profile;
  
  const handleAccept = async () => {
    if (!onAccept) return;
    setIsProcessing(true);
    await onAccept(request.id);
    setIsProcessing(false);
  };

  const handleReject = async () => {
    if (!onReject) return;
    setIsProcessing(true);
    await onReject(request.id);
    setIsProcessing(false);
  };

  const handleCancel = async () => {
    if (!onCancel) return;
    setIsProcessing(true);
    await onCancel(request.id);
    setIsProcessing(false);
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  // For received requests: sender wants to view my goals = receiver_can_view_sender_goals
  // For received requests: I can view their goals = sender_can_view_receiver_goals
  const theyCanViewMyGoals = request.receiver_can_view_sender_goals ?? true;
  const iCanViewTheirGoals = request.sender_can_view_receiver_goals ?? true;

  return (
    <Card className="border-border hover:border-primary/20 transition-colors">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {profile?.full_name || 'Unknown User'}
              </h3>
              {request.message && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  "{request.message}"
                </p>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(new Date(request.created_at))} ago</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {type === 'received' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReject}
                    disabled={isProcessing || loading}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAccept}
                    disabled={isProcessing || loading}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                </>
              )}
              {type === 'sent' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isProcessing || loading}
                  className="text-muted-foreground"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Visibility Settings Preview - Only show for received requests */}
          {type === 'received' && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
              <Badge 
                variant={theyCanViewMyGoals ? "default" : "secondary"} 
                className="text-xs flex items-center gap-1"
              >
                {theyCanViewMyGoals ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                They {theyCanViewMyGoals ? 'can' : "can't"} see your goals
              </Badge>
              <Badge 
                variant={iCanViewTheirGoals ? "default" : "secondary"} 
                className="text-xs flex items-center gap-1"
              >
                {iCanViewTheirGoals ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                You {iCanViewTheirGoals ? 'can' : "can't"} see their goals
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

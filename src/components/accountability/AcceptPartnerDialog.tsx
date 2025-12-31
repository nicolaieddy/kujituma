import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, UserCheck } from 'lucide-react';
import { AccountabilityPartnerRequest } from '@/services/accountabilityService';

interface AcceptPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: AccountabilityPartnerRequest | null;
  onAccept: (
    requestId: string, 
    visibilitySettings: { senderCanViewReceiverGoals: boolean; receiverCanViewSenderGoals: boolean }
  ) => Promise<void>;
  loading?: boolean;
}

export const AcceptPartnerDialog = ({
  open,
  onOpenChange,
  request,
  onAccept,
  loading,
}: AcceptPartnerDialogProps) => {
  const [theyCanViewMyGoals, setTheyCanViewMyGoals] = useState(true);
  const [iCanViewTheirGoals, setICanViewTheirGoals] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize from request values when dialog opens
  useEffect(() => {
    if (request && open) {
      setTheyCanViewMyGoals(request.receiver_can_view_sender_goals ?? true);
      setICanViewTheirGoals(request.sender_can_view_receiver_goals ?? true);
    }
  }, [request, open]);

  const handleAccept = async () => {
    if (!request) return;
    setIsProcessing(true);
    await onAccept(request.id, {
      senderCanViewReceiverGoals: iCanViewTheirGoals,
      receiverCanViewSenderGoals: theyCanViewMyGoals,
    });
    setIsProcessing(false);
    onOpenChange(false);
  };

  if (!request) return null;

  const profile = request.sender_profile;
  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Accept Partner Request
          </DialogTitle>
          <DialogDescription>
            Review and customize visibility settings before accepting this partnership.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Partner Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-foreground">{profile?.full_name || 'Unknown User'}</p>
              {request.message && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  "{request.message}"
                </p>
              )}
            </div>
          </div>

          {/* Requested Settings */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Requested by {profile?.full_name?.split(' ')[0] || 'them'}:</Label>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                {request.receiver_can_view_sender_goals ? 'Can view your goals' : "Can't view your goals"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {request.sender_can_view_receiver_goals ? 'You can view theirs' : "You can't view theirs"}
              </Badge>
            </div>
          </div>

          {/* Editable Visibility Settings */}
          <div className="space-y-3 border rounded-lg p-4 bg-background">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Final Visibility Settings
            </Label>
            <p className="text-xs text-muted-foreground">
              You can modify these settings before accepting:
            </p>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="they-view-my" className="text-sm font-normal">
                    They can view my goals
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {profile?.full_name?.split(' ')[0] || 'They'} will see your goals and progress
                  </p>
                </div>
                <Switch
                  id="they-view-my"
                  checked={theyCanViewMyGoals}
                  onCheckedChange={setTheyCanViewMyGoals}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="i-view-their" className="text-sm font-normal">
                    I can view their goals
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    See {profile?.full_name?.split(' ')[0] || 'their'}'s goals and progress
                  </p>
                </div>
                <Switch
                  id="i-view-their"
                  checked={iCanViewTheirGoals}
                  onCheckedChange={setICanViewTheirGoals}
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="flex flex-wrap gap-2 pt-2">
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
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAccept} disabled={isProcessing || loading}>
            {isProcessing ? 'Accepting...' : 'Accept Partnership'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare } from 'lucide-react';
import { AccountabilityPartner, accountabilityService } from '@/services/accountabilityService';
import { toast } from 'sonner';

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: AccountabilityPartner | null;
  groupId?: string | null;
  groupName?: string;
  weekStart: string;
  onCheckInComplete: () => void;
}

export const CheckInDialog = ({
  open,
  onOpenChange,
  partner,
  groupId = null,
  groupName,
  weekStart,
  onCheckInComplete,
}: CheckInDialogProps) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const result = await accountabilityService.createCheckIn(
      partner?.partnership_id || null,
      groupId || null,
      weekStart,
      message || undefined
    );

    if (result.success) {
      const recipientName = partner?.full_name || groupName || 'the group';
      toast.success(`✅ Check-in sent to ${recipientName}!`);
      setMessage('');
      onCheckInComplete();
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Failed to create check-in');
    }

    setIsSubmitting(false);
  };

  const displayName = partner?.full_name || groupName || 'Accountability';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Check In with {displayName}
          </DialogTitle>
          <DialogDescription>
            {partner 
              ? 'Share your progress and encourage your accountability partner'
              : 'Send a message to your accountability group about your week'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Message (optional)
            </label>
            <Textarea
              placeholder="How's your week going? Share your progress or ask about theirs..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Check-In'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

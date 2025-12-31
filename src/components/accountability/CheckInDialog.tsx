import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare } from 'lucide-react';

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName: string;
  onConfirm: (message?: string) => Promise<void>;
}

export const CheckInDialog = ({ 
  open, 
  onOpenChange, 
  partnerName, 
  onConfirm 
}: CheckInDialogProps) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    await onConfirm(message.trim() || undefined);
    setIsSubmitting(false);
    setMessage('');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMessage('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Record Check-in
          </DialogTitle>
          <DialogDescription>
            Log a check-in with {partnerName}. Add an optional note about what you discussed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="checkin-message">Check-in notes (optional)</Label>
            <Textarea
              id="checkin-message"
              placeholder="What did you discuss? Any updates or blockers?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This note will be saved with this week's check-in history.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Recording...' : 'Record Check-in'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
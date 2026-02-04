import { useEffect, useRef, useState } from 'react';
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
import { toast } from 'sonner';

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

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const promiseWithTimeout = <T,>(promise: Promise<T>, ms: number) => {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error('timeout'));
      }, ms);

      promise
        .then((value) => {
          window.clearTimeout(timeoutId);
          resolve(value);
        })
        .catch((err) => {
          window.clearTimeout(timeoutId);
          reject(err);
        });
    });
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;

    const requestId = ++requestIdRef.current;
    setIsSubmitting(true);

    try {
      await promiseWithTimeout(onConfirm(message.trim() || undefined), 20000);

      // Only update state if this is still the latest request and component is mounted
      if (!mountedRef.current || requestIdRef.current !== requestId) return;

      setMessage('');
      onOpenChange(false);
    } catch (err) {
      // Only show error if component is mounted and request is current
      if (!mountedRef.current || requestIdRef.current !== requestId) return;
      
      console.error('Error recording check-in:', err);

      const isTimeout = err instanceof Error && err.message === 'timeout';
      toast.error(isTimeout 
        ? 'This is taking longer than expected. Check your connection and try again.' 
        : 'Failed to record check-in. Please try again.');
    } finally {
      if (!mountedRef.current || requestIdRef.current !== requestId) return;
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Cancel any in-flight submission UI
      requestIdRef.current += 1;
      setIsSubmitting(false);
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
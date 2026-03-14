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
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Eye, Heart, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName: string;
  onConfirm: (message?: string) => Promise<void>;
}

const QUICK_STARTERS = {
  behavior: [
    "I noticed you completed…",
    "I saw that you didn't…",
    "When you shared about…",
  ],
  impact: [
    "It made me feel inspired because…",
    "I felt concerned because…",
    "It reminded me of my own…",
  ],
  appreciation: [
    "I really appreciate that you…",
    "Thank you for being honest about…",
    "I admire how you…",
  ],
};

export const CheckInDialog = ({ 
  open, 
  onOpenChange, 
  partnerName, 
  onConfirm 
}: CheckInDialogProps) => {
  const [behavior, setBehavior] = useState('');
  const [impact, setImpact] = useState('');
  const [appreciation, setAppreciation] = useState('');
  const [freeformNote, setFreeformNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFramework, setShowFramework] = useState(true);

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

  const buildMessage = (): string | undefined => {
    const parts: string[] = [];
    if (behavior.trim()) parts.push(`**What I observed:** ${behavior.trim()}`);
    if (impact.trim()) parts.push(`**How it landed:** ${impact.trim()}`);
    if (appreciation.trim()) parts.push(`**Appreciation:** ${appreciation.trim()}`);
    if (freeformNote.trim()) parts.push(freeformNote.trim());
    return parts.length > 0 ? parts.join('\n\n') : undefined;
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;

    const requestId = ++requestIdRef.current;
    setIsSubmitting(true);

    try {
      await promiseWithTimeout(onConfirm(buildMessage()), 20000);

      if (!mountedRef.current || requestIdRef.current !== requestId) return;

      setBehavior('');
      setImpact('');
      setAppreciation('');
      setFreeformNote('');
      onOpenChange(false);
    } catch (err) {
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
      requestIdRef.current += 1;
      setIsSubmitting(false);
      setBehavior('');
      setImpact('');
      setAppreciation('');
      setFreeformNote('');
    }
    onOpenChange(newOpen);
  };

  const applyStarter = (setter: (v: string) => void, starter: string) => {
    setter(starter + ' ');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Check-in with {partnerName}
          </DialogTitle>
          <DialogDescription>
            Use the <em>Stay on Your Side of the Net</em> framework to give thoughtful feedback.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* Framework toggle */}
          <button
            type="button"
            onClick={() => setShowFramework(!showFramework)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Badge variant="secondary" className="text-[10px] font-normal gap-1">
              <Sparkles className="h-3 w-3" />
              Connect Framework
            </Badge>
            <span className="flex-1" />
            {showFramework ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showFramework && (
            <div className="bg-accent/30 rounded-lg p-3 border border-accent text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm">Stay on Your Side of the Net</p>
              <p>Share what <strong>you</strong> observed, how it affected <strong>you</strong>, and what you appreciate. Avoid assumptions about their intentions.</p>
            </div>
          )}

          {/* Behavior Observed */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-primary" />
              What I observed
            </Label>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {QUICK_STARTERS.behavior.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applyStarter(setBehavior, s)}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] border border-dashed transition-colors",
                    "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <Textarea
              value={behavior}
              onChange={(e) => setBehavior(e.target.value)}
              placeholder={`What specific behavior did you notice from ${partnerName}?`}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Impact Felt */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4 text-destructive" />
              How it landed on me
            </Label>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {QUICK_STARTERS.impact.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applyStarter(setImpact, s)}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] border border-dashed transition-colors",
                    "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <Textarea
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              placeholder="How did it make you feel? Stay on your side of the net."
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Appreciation */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              Appreciation
            </Label>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {QUICK_STARTERS.appreciation.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applyStarter(setAppreciation, s)}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] border border-dashed transition-colors",
                    "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <Textarea
              value={appreciation}
              onChange={(e) => setAppreciation(e.target.value)}
              placeholder={`What do you genuinely appreciate about ${partnerName}?`}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Freeform fallback */}
          <div className="space-y-2 pt-1 border-t">
            <Label className="text-sm text-muted-foreground">Additional notes (optional)</Label>
            <Textarea
              value={freeformNote}
              onChange={(e) => setFreeformNote(e.target.value)}
              placeholder="Anything else you discussed…"
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            All fields are optional. This is saved with your check-in history.
          </p>
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
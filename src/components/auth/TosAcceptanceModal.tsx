import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, Shield } from 'lucide-react';
import { CURRENT_TOS_VERSION } from '@/constants/tosVersion';

interface TosAcceptanceModalProps {
  open: boolean;
  onAccept: () => Promise<boolean>;
  isNewUser?: boolean;
}

export const TosAcceptanceModal = ({ open, onAccept, isNewUser = false }: TosAcceptanceModalProps) => {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!accepted) return;
    
    setLoading(true);
    const success = await onAccept();
    if (!success) {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {isNewUser ? 'Welcome to Kujituma' : 'Updated Terms of Service'}
          </DialogTitle>
          <DialogDescription>
            {isNewUser 
              ? 'Before you get started, please review and accept our Terms of Service and Privacy Policy.'
              : 'We\'ve updated our Terms of Service. Please review and accept to continue using Kujituma.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <a 
                  href="/terms" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium text-foreground hover:text-primary underline underline-offset-2"
                >
                  Terms of Service
                </a>
                <p className="text-sm text-muted-foreground mt-1">
                  Rules and guidelines for using our platform
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <a 
                  href="/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium text-foreground hover:text-primary underline underline-offset-2"
                >
                  Privacy Policy
                </a>
                <p className="text-sm text-muted-foreground mt-1">
                  How we collect, use, and protect your data
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="accept-tos"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              disabled={loading}
            />
            <Label 
              htmlFor="accept-tos" 
              className="text-sm leading-relaxed cursor-pointer"
            >
              I have read and agree to the Terms of Service and Privacy Policy
            </Label>
          </div>

          <p className="text-xs text-muted-foreground">
            Version {CURRENT_TOS_VERSION} • {new Date().toLocaleDateString()}
          </p>
        </div>

        <Button
          onClick={handleAccept}
          disabled={!accepted || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            'Accept and Continue'
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

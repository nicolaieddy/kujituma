import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { accountabilityService, CheckInCadence } from '@/services/accountabilityService';
import { toast } from 'sonner';
import { Clock, Eye, EyeOff, Settings2, Loader2, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PartnershipSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  partnerName: string;
  currentCadence: CheckInCadence;
  canViewPartnerGoals: boolean;
  partnerCanViewMyGoals: boolean;
  onSettingsChange?: () => void;
}

const CADENCE_OPTIONS: { value: CheckInCadence; label: string; description: string }[] = [
  { value: 'none', label: 'Disabled', description: 'No check-in reminders' },
  { value: 'daily', label: 'Daily', description: 'Check in every day' },
  { value: 'twice_weekly', label: 'Twice Weekly', description: 'Check in every 3-4 days' },
  { value: 'weekly', label: 'Weekly', description: 'Check in once a week' },
  { value: 'biweekly', label: 'Biweekly', description: 'Check in every 2 weeks' },
];

export const PartnershipSettingsModal = ({
  open,
  onOpenChange,
  partnerId,
  partnerName,
  currentCadence,
  canViewPartnerGoals,
  partnerCanViewMyGoals,
  onSettingsChange,
}: PartnershipSettingsModalProps) => {
  const [cadence, setCadence] = useState<CheckInCadence>(currentCadence);
  const [shareMyGoals, setShareMyGoals] = useState(partnerCanViewMyGoals);
  const [viewPartnerGoals, setViewPartnerGoals] = useState(canViewPartnerGoals);
  const [isSavingCadence, setIsSavingCadence] = useState(false);
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);
  const [isSavingViewPartner, setIsSavingViewPartner] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCadence(currentCadence);
      setShareMyGoals(partnerCanViewMyGoals);
      setViewPartnerGoals(canViewPartnerGoals);
    }
  }, [open, currentCadence, partnerCanViewMyGoals, canViewPartnerGoals]);

  const handleCadenceChange = async (newCadence: CheckInCadence) => {
    setCadence(newCadence);
    setIsSavingCadence(true);

    const result = await accountabilityService.updateCheckInCadence(partnerId, newCadence);
    
    setIsSavingCadence(false);

    if (result.success) {
      toast.success(newCadence === 'none' ? 'Check-ins disabled' : 'Check-in cadence updated');
      onSettingsChange?.();
    } else {
      toast.error(result.error || 'Failed to update cadence');
      setCadence(currentCadence);
    }
  };

  const handleVisibilityChange = async (share: boolean) => {
    setShareMyGoals(share);
    setIsSavingVisibility(true);

    const result = await accountabilityService.updateVisibilitySettings(partnerId, {
      partnerCanViewMyGoals: share,
    });

    setIsSavingVisibility(false);

    if (result.success) {
      toast.success(share ? 'Now sharing your goals' : 'Stopped sharing your goals');
      onSettingsChange?.();
    } else {
      toast.error(result.error || 'Failed to update visibility');
      setShareMyGoals(partnerCanViewMyGoals);
    }
  };

  const handleViewPartnerGoalsChange = async (view: boolean) => {
    setViewPartnerGoals(view);
    setIsSavingViewPartner(true);

    const result = await accountabilityService.updateVisibilitySettings(partnerId, {
      canViewPartnerGoals: view,
    });

    setIsSavingViewPartner(false);

    if (result.success) {
      toast.success(view ? `Now viewing ${partnerName}'s goals` : `Stopped viewing ${partnerName}'s goals`);
      onSettingsChange?.();
    } else {
      toast.error(result.error || 'Failed to update visibility');
      setViewPartnerGoals(canViewPartnerGoals);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Partnership Settings
          </DialogTitle>
          <DialogDescription>
            Configure your accountability partnership with {partnerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Check-in Cadence */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Check-in Cadence</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              How often you want to check in with {partnerName}. You'll be reminded when a check-in is due.
            </p>
            <Select 
              value={cadence} 
              onValueChange={(v) => handleCadenceChange(v as CheckInCadence)}
              disabled={isSavingCadence}
            >
              <SelectTrigger className={cn(isSavingCadence && "opacity-50")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CADENCE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className={cn(option.value === 'none' && "text-muted-foreground")}>
                        {option.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cadence === 'none' && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <BellOff className="h-3 w-3" />
                <span>Check-in reminders are disabled for this partner</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Goal Visibility */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {shareMyGoals || viewPartnerGoals ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <Label className="text-sm font-medium">Goal Visibility</Label>
            </div>

            {/* Share my goals toggle */}
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label className="text-sm">Share my goals with {partnerName}</Label>
                <p className="text-xs text-muted-foreground">
                  Allow {partnerName} to see your goals and weekly objectives
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSavingVisibility && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <Switch
                  checked={shareMyGoals}
                  onCheckedChange={handleVisibilityChange}
                  disabled={isSavingVisibility}
                />
              </div>
            </div>

            {/* View partner's goals toggle */}
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label className="text-sm">View {partnerName}'s goals</Label>
                <p className="text-xs text-muted-foreground">
                  {partnerCanViewMyGoals 
                    ? `See ${partnerName}'s goals and weekly objectives (they are sharing with you)`
                    : `${partnerName} is not sharing their goals with you`
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSavingViewPartner && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <Switch
                  checked={viewPartnerGoals}
                  onCheckedChange={handleViewPartnerGoalsChange}
                  disabled={isSavingViewPartner || !partnerCanViewMyGoals}
                />
              </div>
            </div>

            {!partnerCanViewMyGoals && (
              <p className="text-xs text-muted-foreground italic">
                Note: You can only view {partnerName}'s goals if they choose to share them with you.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

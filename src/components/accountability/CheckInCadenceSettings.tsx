import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { accountabilityService, CheckInCadence } from '@/services/accountabilityService';
import { toast } from 'sonner';
import { Clock, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckInCadenceSettingsProps {
  partnerId: string;
  partnerName: string;
  currentCadence: CheckInCadence;
  onCadenceChange?: (cadence: CheckInCadence) => void;
  compact?: boolean;
}

const CADENCE_OPTIONS: { value: CheckInCadence; label: string; description: string }[] = [
  { value: 'daily', label: 'Daily', description: 'Check in every day' },
  { value: 'twice_weekly', label: 'Twice Weekly', description: 'Check in every 3-4 days' },
  { value: 'weekly', label: 'Weekly', description: 'Check in once a week' },
  { value: 'biweekly', label: 'Biweekly', description: 'Check in every 2 weeks' },
];

export const CheckInCadenceSettings = ({
  partnerId,
  partnerName,
  currentCadence,
  onCadenceChange,
  compact = false,
}: CheckInCadenceSettingsProps) => {
  const [cadence, setCadence] = useState<CheckInCadence>(currentCadence);
  const [isSaving, setIsSaving] = useState(false);

  const handleCadenceChange = async (newCadence: CheckInCadence) => {
    setCadence(newCadence);
    setIsSaving(true);

    const result = await accountabilityService.updateCheckInCadence(partnerId, newCadence);
    
    setIsSaving(false);

    if (result.success) {
      toast.success('Check-in cadence updated');
      onCadenceChange?.(newCadence);
    } else {
      toast.error(result.error || 'Failed to update cadence');
      setCadence(currentCadence); // Revert on error
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Your check-in cadence with {partnerName}</TooltipContent>
        </Tooltip>
        <Select value={cadence} onValueChange={(v) => handleCadenceChange(v as CheckInCadence)}>
          <SelectTrigger className="h-7 text-xs w-[110px]" disabled={isSaving}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CADENCE_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Check-in Cadence</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Set how often you want to check in with {partnerName}. You'll be reminded when a check-in is due.
      </p>
      <Select value={cadence} onValueChange={(v) => handleCadenceChange(v as CheckInCadence)}>
        <SelectTrigger className={cn(isSaving && "opacity-50")} disabled={isSaving}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CADENCE_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col">
                <span>{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

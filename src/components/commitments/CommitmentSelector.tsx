import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Target } from 'lucide-react';
import { WeeklyObjective } from '@/types/weeklyProgress';
import { commitmentsService } from '@/services/commitmentsService';
import { toast } from 'sonner';

interface CommitmentSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectives: WeeklyObjective[];
  weekStart: string;
  currentCommitments?: string[];
  onCommitmentsSet: () => void;
}

export const CommitmentSelector = ({
  open,
  onOpenChange,
  objectives,
  weekStart,
  currentCommitments = [],
  onCommitmentsSet,
}: CommitmentSelectorProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(currentCommitments);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 3) {
        toast.error('You can only select 3 objectives');
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSubmit = async () => {
    if (selectedIds.length !== 3) {
      toast.error('Please select exactly 3 objectives');
      return;
    }

    setIsSubmitting(true);
    const result = await commitmentsService.setPublicCommitments(weekStart, selectedIds);

    if (result.success) {
      toast.success('🎯 Commitments declared! Your top 3 are now visible to friends.');
      onCommitmentsSet();
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Failed to set commitments');
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Declare Your Top 3 Objectives
          </DialogTitle>
          <DialogDescription>
            Select your 3 most important objectives for this week. These will be visible to your friends as public commitments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {objectives.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Add some objectives first to make commitments
            </p>
          ) : (
            objectives.map((obj) => (
              <div
                key={obj.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  selectedIds.includes(obj.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  checked={selectedIds.includes(obj.id)}
                  onCheckedChange={() => handleToggle(obj.id)}
                  disabled={!selectedIds.includes(obj.id) && selectedIds.length >= 3}
                />
                <div className="flex-1">
                  <p className={`text-sm ${obj.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                    {obj.text}
                  </p>
                  {selectedIds.includes(obj.id) && (
                    <span className="text-xs text-primary font-medium">
                      #{selectedIds.indexOf(obj.id) + 1}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedIds.length} of 3 selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedIds.length !== 3 || isSubmitting}
            >
              {isSubmitting ? 'Declaring...' : 'Declare Commitments'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

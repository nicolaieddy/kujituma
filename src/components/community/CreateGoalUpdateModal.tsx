import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, HelpCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';
import { GoalUpdatesService } from '@/services/goalUpdatesService';
import { toast } from 'sonner';

interface CreateGoalUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedGoalId?: string;
  onSuccess?: () => void;
}

export const CreateGoalUpdateModal = ({
  isOpen,
  onClose,
  preselectedGoalId,
  onSuccess
}: CreateGoalUpdateModalProps) => {
  const { user } = useAuth();
  const { goals } = useGoals();
  
  const [selectedGoalId, setSelectedGoalId] = useState(preselectedGoalId || '');
  const [updateText, setUpdateText] = useState('');
  const [askingForHelp, setAskingForHelp] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter to only active goals that are visible to friends
  const shareableGoals = goals.filter(g => 
    g.status !== 'deprioritized' && 
    g.visibility !== 'private'
  );

  const handleClose = () => {
    setSelectedGoalId(preselectedGoalId || '');
    setUpdateText('');
    setAskingForHelp(false);
    setHelpMessage('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!user || !selectedGoalId) return;
    
    if (!updateText.trim() && !askingForHelp) {
      toast.error('Please write something to share');
      return;
    }

    if (askingForHelp && !helpMessage.trim()) {
      toast.error('Please describe what help you need');
      return;
    }

    setIsSubmitting(true);

    try {
      const today = new Date().toISOString().split('T')[0];

      if (askingForHelp) {
        // Create help request update
        await GoalUpdatesService.createHelpRequest({
          userId: user.id,
          goalId: selectedGoalId,
          helpMessage: helpMessage.trim(),
          weekStart: today
        });
        toast.success('Help request posted! Your friends will be notified.');
      } else {
        // Create regular progress update
        await GoalUpdatesService.createUpdate({
          goal_id: selectedGoalId,
          user_id: user.id,
          update_type: 'reflection',
          content: updateText.trim(),
          week_start: today
        });
        toast.success('Update shared with your community!');
      }

      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create goal update:', error);
      toast.error('Failed to share update. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedGoal = shareableGoals.find(g => g.id === selectedGoalId);
  const canSubmit = selectedGoalId && (updateText.trim() || (askingForHelp && helpMessage.trim()));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Share Goal Update
          </DialogTitle>
          <DialogDescription>
            Share your progress with your community and get support on your journey.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Goal Selector */}
          <div className="space-y-2">
            <Label htmlFor="goal-select">Which goal is this about?</Label>
            <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
              <SelectTrigger id="goal-select">
                <SelectValue placeholder="Select a goal..." />
              </SelectTrigger>
              <SelectContent>
                {shareableGoals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {shareableGoals.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No shareable goals found. Make sure you have goals that aren't private.
              </p>
            )}
          </div>

          {/* Update Text */}
          {!askingForHelp && (
            <div className="space-y-2">
              <Label htmlFor="update-text">What's happening?</Label>
              <Textarea
                id="update-text"
                placeholder="Share a win, reflection, or update on your progress..."
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          )}

          {/* Ask for Help Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium text-foreground">Ask for help</p>
                <p className="text-sm text-muted-foreground">Request advice or support from friends</p>
              </div>
            </div>
            <Switch
              checked={askingForHelp}
              onCheckedChange={setAskingForHelp}
            />
          </div>

          {/* Help Message */}
          {askingForHelp && (
            <div className="space-y-2">
              <Label htmlFor="help-message">What do you need help with?</Label>
              <Textarea
                id="help-message"
                placeholder="Describe what you're struggling with or what kind of advice you're looking for..."
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                rows={4}
                className="resize-none border-orange-500/30 focus-visible:ring-orange-500/50"
              />
            </div>
          )}

          {/* Selected Goal Preview */}
          {selectedGoal && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">Posting to:</p>
              <p className="font-medium text-foreground">{selectedGoal.title}</p>
              {selectedGoal.category && (
                <p className="text-xs text-muted-foreground mt-1">{selectedGoal.category}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!canSubmit || isSubmitting}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {askingForHelp ? 'Ask for Help' : 'Share Update'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

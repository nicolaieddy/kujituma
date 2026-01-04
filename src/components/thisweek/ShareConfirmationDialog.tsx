import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HelpCircle } from "lucide-react";

interface Goal {
  id: string;
  title: string;
}

interface ShareConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (helpRequest?: { goalId: string; message: string }) => void;
  isSharing: boolean;
  goals?: Goal[];
}

export const ShareConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  isSharing,
  goals = []
}: ShareConfirmationDialogProps) => {
  const [askForHelp, setAskForHelp] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [helpMessage, setHelpMessage] = useState("");

  const handleConfirm = () => {
    if (askForHelp && selectedGoalId && helpMessage.trim()) {
      onConfirm({ goalId: selectedGoalId, message: helpMessage.trim() });
    } else {
      onConfirm();
    }
    // Reset state
    setAskForHelp(false);
    setSelectedGoalId("");
    setHelpMessage("");
  };

  const handleClose = () => {
    setAskForHelp(false);
    setSelectedGoalId("");
    setHelpMessage("");
    onClose();
  };

  const activeGoals = goals.filter(g => g.id && g.title);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Share Week with Community?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                <strong>Warning:</strong> Once you share your weekly progress, it becomes{" "}
                <span className="text-destructive font-semibold">permanent and uneditable</span>.
              </p>
              <p>You will not be able to:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Edit your weekly objectives</li>
                <li>Modify your reflection text</li>
                <li>Change completion status</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Ask for Help Section */}
        {activeGoals.length > 0 && (
          <div className="border-t pt-4 mt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ask-for-help"
                checked={askForHelp}
                onCheckedChange={(checked) => setAskForHelp(checked === true)}
              />
              <Label 
                htmlFor="ask-for-help" 
                className="flex items-center gap-2 cursor-pointer text-sm font-medium"
              >
                <HelpCircle className="h-4 w-4 text-orange-500" />
                Ask friends for help on a goal
              </Label>
            </div>

            {askForHelp && (
              <div className="space-y-3 pl-6 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <Label htmlFor="goal-select" className="text-sm">Which goal?</Label>
                  <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
                    <SelectTrigger id="goal-select">
                      <SelectValue placeholder="Select a goal" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeGoals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="help-message" className="text-sm">What do you need help with?</Label>
                  <Textarea
                    id="help-message"
                    placeholder="e.g., Looking for advice on staying motivated, need recommendations for resources, stuck on a specific challenge..."
                    value={helpMessage}
                    onChange={(e) => setHelpMessage(e.target.value)}
                    className="min-h-[80px] text-sm"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {helpMessage.length}/500 characters
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={isSharing}
            onClick={handleClose}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isSharing || (askForHelp && (!selectedGoalId || !helpMessage.trim()))}
          >
            {isSharing ? "Sharing..." : askForHelp ? "Share & Ask for Help" : "Share & Lock Week"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

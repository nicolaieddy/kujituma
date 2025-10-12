import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface IncompleteObjectivesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incompleteObjectives: WeeklyObjective[];
  onConfirmPost: (reflections: Record<string, string>) => void;
  isPosting: boolean;
}

export const IncompleteObjectivesModal = ({
  open,
  onOpenChange,
  incompleteObjectives,
  onConfirmPost,
  isPosting,
}: IncompleteObjectivesModalProps) => {
  const [reflections, setReflections] = useState<Record<string, string>>({});

  const handleReflectionChange = (objectiveId: string, reflection: string) => {
    setReflections(prev => ({
      ...prev,
      [objectiveId]: reflection
    }));
  };

  const handleConfirm = () => {
    onConfirmPost(reflections);
  };

  const allReflectionsProvided = incompleteObjectives.every(
    obj => reflections[obj.id]?.trim().length > 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto glass-card shadow-elegant">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Reflect on Incomplete Objectives
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm">
            You have {incompleteObjectives.length} incomplete objective{incompleteObjectives.length > 1 ? 's' : ''}. 
            Please reflect on why you weren't able to complete {incompleteObjectives.length > 1 ? 'each one' : 'it'} 
            before posting to the feed. This helps with accountability and learning.
          </p>

          {incompleteObjectives.map((objective) => (
            <div key={objective.id} className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-muted-foreground bg-transparent mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-foreground font-medium mb-2">{objective.text}</h4>
                  <div className="space-y-2">
                    <label className="text-muted-foreground text-sm block">
                      Why wasn't this objective completed?
                    </label>
                    <Textarea
                      value={reflections[objective.id] || ''}
                      onChange={(e) => handleReflectionChange(objective.id, e.target.value)}
                      placeholder="Reflect on what prevented you from completing this objective..."
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPosting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!allReflectionsProvided || isPosting}
              className={`${
                allReflectionsProvided
                  ? 'gradient-primary shadow-elegant hover:shadow-lift'
                  : 'bg-muted cursor-not-allowed'
              }`}
            >
              {isPosting ? (
                "Posting..."
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Post to Feed
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
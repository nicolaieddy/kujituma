import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { WeeklyObjective, CarryOverObjective } from "@/types/weeklyProgress";
import { AlertTriangle, CheckCircle, ArrowRight, RotateCcw, Clock } from "lucide-react";

interface IncompleteObjectivesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incompleteObjectives: WeeklyObjective[] | CarryOverObjective[];
  onConfirmPost: (reflections: Record<string, string>, carryOverIds: string[]) => void;
  isPosting: boolean;
}

export const IncompleteObjectivesModal = ({
  open,
  onOpenChange,
  incompleteObjectives,
  onConfirmPost,
  isPosting,
}: IncompleteObjectivesModalProps) => {
  const [step, setStep] = useState<'reflection' | 'carryover'>('reflection');
  const [reflections, setReflections] = useState<Record<string, string>>({});
  const [carryOverIds, setCarryOverIds] = useState<Set<string>>(new Set());

  const handleReflectionChange = (objectiveId: string, reflection: string) => {
    setReflections(prev => ({
      ...prev,
      [objectiveId]: reflection
    }));
  };

  const handleToggleCarryOver = (objectiveId: string) => {
    const newSet = new Set(carryOverIds);
    if (newSet.has(objectiveId)) {
      newSet.delete(objectiveId);
    } else {
      newSet.add(objectiveId);
    }
    setCarryOverIds(newSet);
  };

  const handleSelectAllCarryOver = () => {
    if (carryOverIds.size === incompleteObjectives.length) {
      setCarryOverIds(new Set());
    } else {
      setCarryOverIds(new Set(incompleteObjectives.map(obj => obj.id)));
    }
  };

  const handleContinueToCarryOver = () => {
    setStep('carryover');
  };

  const handleBackToReflection = () => {
    setStep('reflection');
  };

  const handleConfirm = () => {
    onConfirmPost(reflections, Array.from(carryOverIds));
    // Reset state after confirm
    setStep('reflection');
    setReflections({});
    setCarryOverIds(new Set());
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      // Reset state when closing
      setStep('reflection');
      setReflections({});
      setCarryOverIds(new Set());
    }
    onOpenChange(open);
  };

  const allReflectionsProvided = incompleteObjectives.every(
    obj => reflections[obj.id]?.trim().length > 0
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto glass-card shadow-elegant">
        {step === 'reflection' ? (
          <>
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
                  onClick={() => handleClose(false)}
                  disabled={isPosting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleContinueToCarryOver}
                  disabled={!allReflectionsProvided || isPosting}
                  className={`${
                    allReflectionsProvided
                      ? 'gradient-primary shadow-elegant hover:shadow-lift'
                      : 'bg-muted cursor-not-allowed'
                  }`}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Continue
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary" />
                Carry Forward to Next Week?
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <p className="text-muted-foreground text-sm">
                Would you like to carry any of these objectives forward to next week? 
                Objectives not carried forward will remain in this week as incomplete (with your reflections saved).
              </p>

              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">
                  {carryOverIds.size} of {incompleteObjectives.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllCarryOver}
                >
                  {carryOverIds.size === incompleteObjectives.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <div className="space-y-3">
                {incompleteObjectives.map((objective) => {
                  const isSelected = carryOverIds.has(objective.id);
                  
                  return (
                    <div 
                      key={objective.id} 
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-primary/20 border-primary/40' 
                          : 'bg-muted/30 border-border hover:bg-muted/50'
                      }`}
                      onClick={() => handleToggleCarryOver(objective.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleCarryOver(objective.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-medium">{objective.text}</p>
                          {reflections[objective.id] && (
                            <p className="text-muted-foreground text-xs mt-1 italic">
                              "{reflections[objective.id]}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between gap-3 pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={handleBackToReflection}
                  disabled={isPosting}
                >
                  Back
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleClose(false)}
                    disabled={isPosting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={isPosting}
                    className="gradient-primary shadow-elegant hover:shadow-lift"
                  >
                    {isPosting ? (
                      "Posting..."
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {carryOverIds.size > 0 
                          ? `Post & Carry Forward ${carryOverIds.size}`
                          : 'Post to Feed'
                        }
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

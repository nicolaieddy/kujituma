import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  CheckCircle2, 
  Circle,
  ArrowRight,
  Target,
  Calendar,
  PartyPopper,
  Lightbulb
} from "lucide-react";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { Goal } from "@/types/goals";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { cn } from "@/lib/utils";

interface WeekTransitionCardProps {
  // Last week data
  lastWeekObjectives: WeeklyObjective[];
  lastWeekStart: string;
  lastWeekReflections: Record<string, string>;
  // Current week data
  currentWeekStart: string;
  goals: Goal[];
  // Handlers
  onUpdateReflection: (objectiveId: string, reflection: string) => void;
  onCarryOver: (objectiveIds: string[]) => void;
  onSetIntention: (intention: string) => void;
  onComplete: (intention?: string) => void;
  // State
  isCarryingOver?: boolean;
  intention?: string;
}

type TransitionStep = 'review' | 'reflect' | 'carry-over' | 'intention' | 'complete';

const REFLECTION_PROMPTS = [
  "What blocked this?",
  "Is this still important?",
  "What would help next time?",
  "Can this be broken down smaller?",
];

export const WeekTransitionCard = ({
  lastWeekObjectives,
  lastWeekStart,
  lastWeekReflections,
  // currentWeekStart unused - keeping for potential future use
  goals,
  onUpdateReflection,
  onCarryOver,
  // onSetIntention is now handled through onComplete
  onComplete,
  isCarryingOver = false,
  intention = "",
}: WeekTransitionCardProps) => {
  const [currentStep, setCurrentStep] = useState<TransitionStep>('review');
  const [selectedForCarryOver, setSelectedForCarryOver] = useState<Set<string>>(new Set());
  const [localIntention, setLocalIntention] = useState(intention);

  // Compute stats
  const completedObjectives = lastWeekObjectives.filter(obj => obj.is_completed);
  const incompleteObjectives = lastWeekObjectives.filter(obj => !obj.is_completed);
  const completionRate = lastWeekObjectives.length > 0 
    ? Math.round((completedObjectives.length / lastWeekObjectives.length) * 100) 
    : 0;
  const hasIncomplete = incompleteObjectives.length > 0;

  const lastWeekRange = useMemo(() => 
    WeeklyProgressService.formatWeekRange(lastWeekStart), 
    [lastWeekStart]
  );

  const steps: TransitionStep[] = hasIncomplete 
    ? ['review', 'reflect', 'carry-over', 'intention', 'complete']
    : ['review', 'intention', 'complete'];

  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleToggleCarryOver = (objectiveId: string) => {
    setSelectedForCarryOver(prev => {
      const next = new Set(prev);
      if (next.has(objectiveId)) {
        next.delete(objectiveId);
      } else {
        next.add(objectiveId);
      }
      return next;
    });
  };

  const handleCompleteTransition = () => {
    // Carry over selected objectives
    if (selectedForCarryOver.size > 0) {
      onCarryOver(Array.from(selectedForCarryOver));
    }
    // Complete with intention (onComplete now handles both planning completion and intention saving)
    onComplete(localIntention.trim() || undefined);
  };

  const getGoalTitle = (goalId: string | null) => {
    if (!goalId) return null;
    return goals.find(g => g.id === goalId)?.title || null;
  };

  return (
    <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-secondary/5 overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Week Transition
          </CardTitle>
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <div 
                key={step}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index <= currentStepIndex ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {currentStep === 'review' && `Review last week (${lastWeekRange})`}
          {currentStep === 'reflect' && "Quick reflections on incomplete objectives"}
          {currentStep === 'carry-over' && "Select objectives to bring forward"}
          {currentStep === 'intention' && "Set your intention for this week"}
          {currentStep === 'complete' && "You're all set!"}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Step 1: Review */}
        {currentStep === 'review' && (
          <div className="space-y-4">
            {/* Completion summary */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-background border">
              <div className="relative">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-muted"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={`${completionRate * 1.76} 176`}
                    className="text-primary transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                  {completionRate}%
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {completedObjectives.length} of {lastWeekObjectives.length} objectives completed
                </p>
                <p className="text-sm text-muted-foreground">
                  {completionRate >= 80 && "Amazing progress! 🎉"}
                  {completionRate >= 50 && completionRate < 80 && "Good work! Keep the momentum going."}
                  {completionRate < 50 && completionRate > 0 && "Every step counts. Let's reflect and improve."}
                  {completionRate === 0 && lastWeekObjectives.length > 0 && "Let's understand what happened and plan better."}
                  {lastWeekObjectives.length === 0 && "No objectives were set last week."}
                </p>
              </div>
            </div>

            {/* Completed objectives */}
            {completedObjectives.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Completed ({completedObjectives.length})
                </h4>
                <div className="space-y-1">
                  {completedObjectives.slice(0, 3).map(obj => (
                    <div key={obj.id} className="flex items-start gap-2 text-sm p-2 rounded bg-success/10">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span className="line-through text-muted-foreground">{obj.text}</span>
                    </div>
                  ))}
                  {completedObjectives.length > 3 && (
                    <p className="text-xs text-muted-foreground pl-6">
                      +{completedObjectives.length - 3} more completed
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Incomplete objectives preview */}
            {incompleteObjectives.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Circle className="h-4 w-4 text-amber-500" />
                  Incomplete ({incompleteObjectives.length})
                </h4>
                <div className="space-y-1">
                  {incompleteObjectives.slice(0, 3).map(obj => (
                    <div key={obj.id} className="flex items-start gap-2 text-sm p-2 rounded bg-amber-500/10">
                      <Circle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <span>{obj.text}</span>
                    </div>
                  ))}
                  {incompleteObjectives.length > 3 && (
                    <p className="text-xs text-muted-foreground pl-6">
                      +{incompleteObjectives.length - 3} more to review
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Celebration for 100% */}
            {completionRate === 100 && lastWeekObjectives.length > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/30">
                <PartyPopper className="h-8 w-8 text-success" />
                <div>
                  <p className="font-semibold text-success">Perfect Week! 🎉</p>
                  <p className="text-sm text-muted-foreground">
                    You completed everything you set out to do!
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Reflect on incomplete */}
        {currentStep === 'reflect' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Lightbulb className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-sm">
                Quick notes help you learn and plan better. These are private.
              </p>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {incompleteObjectives.map((obj, index) => (
                <div key={obj.id} className="p-3 rounded-lg bg-muted/50 border space-y-2">
                  <div className="flex items-start gap-2">
                    <Circle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{obj.text}</p>
                      {getGoalTitle(obj.goal_id) && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {getGoalTitle(obj.goal_id)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic pl-6">
                    💭 {REFLECTION_PROMPTS[index % REFLECTION_PROMPTS.length]}
                  </p>
                  <Textarea
                    value={lastWeekReflections[obj.id] || ""}
                    onChange={(e) => onUpdateReflection(obj.id, e.target.value)}
                    placeholder="Optional: Why wasn't this completed?"
                    className="resize-none text-sm min-h-[60px]"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Carry over selection */}
        {currentStep === 'carry-over' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Select objectives to move to this week
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedForCarryOver.size === incompleteObjectives.length) {
                    setSelectedForCarryOver(new Set());
                  } else {
                    setSelectedForCarryOver(new Set(incompleteObjectives.map(o => o.id)));
                  }
                }}
              >
                {selectedForCarryOver.size === incompleteObjectives.length ? "Deselect all" : "Select all"}
              </Button>
            </div>

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
              {incompleteObjectives.map(obj => (
                <label
                  key={obj.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedForCarryOver.has(obj.id) 
                      ? "bg-primary/10 border-primary/30" 
                      : "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={selectedForCarryOver.has(obj.id)}
                    onCheckedChange={() => handleToggleCarryOver(obj.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{obj.text}</p>
                    {getGoalTitle(obj.goal_id) && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {getGoalTitle(obj.goal_id)}
                      </Badge>
                    )}
                    {lastWeekReflections[obj.id] && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{lastWeekReflections[obj.id].slice(0, 50)}..."
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {selectedForCarryOver.size > 0 && (
              <div className="flex items-center gap-2 p-2 rounded bg-primary/10 text-sm">
                <ArrowRight className="h-4 w-4 text-primary" />
                <span>{selectedForCarryOver.size} objective(s) will be added to this week</span>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Set intention */}
        {currentStep === 'intention' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
              <Target className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm">
                Setting an intention helps focus your energy for the week.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">What's your focus this week?</label>
              <Textarea
                value={localIntention}
                onChange={(e) => setLocalIntention(e.target.value)}
                placeholder="e.g., Ship the MVP, Focus on deep work, Prioritize health..."
                className="resize-none min-h-[100px]"
                rows={3}
              />
            </div>

            <div className="text-xs text-muted-foreground">
              💡 Tip: Be specific but concise. One clear focus beats many scattered goals.
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {currentStep === 'complete' && (
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/20 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Ready to Crush This Week!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedForCarryOver.size > 0 && (
                  <span>{selectedForCarryOver.size} objectives carried forward. </span>
                )}
                {localIntention.trim() && (
                  <span>Your focus: "{localIntention.slice(0, 40)}..."</span>
                )}
                {!selectedForCarryOver.size && !localIntention.trim() && (
                  <span>Your week is ready to go!</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {currentStep !== 'complete' ? (
            <Button onClick={handleNext} className="gap-1">
              {currentStep === 'reflect' && incompleteObjectives.every(obj => !lastWeekReflections[obj.id]) 
                ? "Skip" 
                : "Continue"
              }
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleCompleteTransition} 
              disabled={isCarryingOver}
              className="gap-1"
            >
              {isCarryingOver ? "Saving..." : "Start My Week"}
              <Sparkles className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

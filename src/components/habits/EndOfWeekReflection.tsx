import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, HelpCircle, Lock, ChevronDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface EndOfWeekReflectionProps {
  objectives: Array<{ id: string; text: string; is_completed: boolean }>;
  incompleteReflections: Record<string, string>;
  onUpdateReflection: (objectiveId: string, reflection: string) => void;
  isReadOnly?: boolean;
}

const REFLECTION_PROMPTS = [
  "What prevented me from completing this?",
  "What would I do differently?",
  "Is this still a priority?",
  "What's the smallest step I could take?",
];

export const EndOfWeekReflection = ({
  objectives,
  incompleteReflections,
  onUpdateReflection,
  isReadOnly = false,
}: EndOfWeekReflectionProps) => {
  const incompleteObjectives = objectives.filter(obj => !obj.is_completed);
  const hasIncomplete = incompleteObjectives.length > 0;
  const [isOpen, setIsOpen] = useState(hasIncomplete);

  // Auto-collapse when no incomplete objectives
  useEffect(() => {
    setIsOpen(hasIncomplete);
  }, [hasIncomplete]);
  
  if (incompleteObjectives.length === 0) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <h3 className="font-semibold text-success">All objectives completed!</h3>
              <p className="text-sm text-muted-foreground">
                Amazing work this week! You crushed it.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-amber-500/5 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Incomplete Objectives Review
                {/* Removed nested TooltipProvider - using App-level provider */}
                <Tooltip>
                  <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Understanding why objectives weren't completed helps you plan better next week.</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Private
                </span>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-left">
              Quick notes on why these specific tasks weren't finished — only visible to you
            </p>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {incompleteObjectives.map((objective, index) => (
              <div 
                key={objective.id} 
                className="p-4 rounded-lg bg-muted/50 border border-border space-y-3"
              >
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground">○</span>
                  <span className="text-sm font-medium">{objective.text}</span>
                </div>
                
                {/* Prompt suggestion */}
                <p className="text-xs text-muted-foreground italic">
                  💭 {REFLECTION_PROMPTS[index % REFLECTION_PROMPTS.length]}
                </p>
                
                <Textarea
                  value={incompleteReflections[objective.id] || ""}
                  onChange={(e) => onUpdateReflection(objective.id, e.target.value)}
                  placeholder="Why wasn't this completed? What did you learn?"
                  className="resize-none text-sm"
                  rows={2}
                  disabled={isReadOnly}
                />
              </div>
            ))}
            
            {/* Encouragement */}
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Remember:</span> Incomplete doesn't mean failure. 
                Every reflection is a step toward better planning and self-awareness.
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

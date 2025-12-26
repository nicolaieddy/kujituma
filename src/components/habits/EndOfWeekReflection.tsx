import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Incomplete Objectives Review
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Understanding why objectives weren't completed helps you plan better next week.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Quick notes on why these specific tasks weren't finished (private, not shared)
        </p>
      </CardHeader>
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
    </Card>
  );
};

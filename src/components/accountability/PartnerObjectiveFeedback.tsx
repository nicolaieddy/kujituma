import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThumbsUp, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeedbackType, ObjectiveFeedback } from "@/hooks/useObjectiveFeedback";

interface PartnerObjectiveFeedbackProps {
  objectiveId: string;
  feedback: ObjectiveFeedback | undefined;
  onToggleFeedback: (feedbackType: FeedbackType) => void;
  isToggling: boolean;
}

export const PartnerObjectiveFeedback = ({
  objectiveId,
  feedback,
  onToggleFeedback,
  isToggling,
}: PartnerObjectiveFeedbackProps) => {
  const isAgree = feedback?.feedback_type === 'agree';
  const isQuestion = feedback?.feedback_type === 'question';

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0 transition-all",
              isAgree 
                ? "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 hover:text-emerald-600" 
                : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
            )}
            onClick={() => onToggleFeedback('agree')}
            disabled={isToggling}
          >
            <ThumbsUp className={cn("h-4 w-4", isAgree && "fill-current")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{isAgree ? "You agreed with this objective" : "Strongly agree with this objective"}</p>
        </TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0 transition-all",
              isQuestion 
                ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 hover:text-amber-600" 
                : "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
            )}
            onClick={() => onToggleFeedback('question')}
            disabled={isToggling}
          >
            <HelpCircle className={cn("h-4 w-4", isQuestion && "fill-current")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{isQuestion ? "You questioned this objective" : "Question if this should be an objective"}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

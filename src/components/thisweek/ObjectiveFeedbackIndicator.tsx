import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThumbsUp, HelpCircle } from "lucide-react";
import { ObjectiveFeedback } from "@/hooks/useObjectiveFeedback";
import { cn } from "@/lib/utils";

interface ObjectiveFeedbackIndicatorProps {
  agreeFeedback: ObjectiveFeedback[];
  questionFeedback: ObjectiveFeedback[];
}

export const ObjectiveFeedbackIndicator = ({
  agreeFeedback,
  questionFeedback,
}: ObjectiveFeedbackIndicatorProps) => {
  if (agreeFeedback.length === 0 && questionFeedback.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {agreeFeedback.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <ThumbsUp className="h-3 w-3 text-emerald-600 fill-current" />
              <div className="flex -space-x-1.5">
                {agreeFeedback.slice(0, 3).map((f) => (
                  <Avatar key={f.id} className="h-4 w-4 ring-1 ring-background">
                    <AvatarImage src={f.partner?.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px] bg-emerald-500/20 text-emerald-700">
                      {f.partner?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {agreeFeedback.length > 3 && (
                <span className="text-[10px] text-emerald-600 font-medium">
                  +{agreeFeedback.length - 3}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium text-xs text-emerald-600 flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                Partners who agree:
              </p>
              <ul className="text-xs space-y-1.5">
                {agreeFeedback.map(f => (
                  <li key={f.id} className="flex flex-col gap-0.5">
                    <span className="font-medium">{f.partner?.full_name}</span>
                    {f.comment && (
                      <span className="text-muted-foreground italic pl-2 border-l-2 border-emerald-500/30">
                        "{f.comment}"
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      )}

      {questionFeedback.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <HelpCircle className="h-3 w-3 text-amber-600 fill-current" />
              <div className="flex -space-x-1.5">
                {questionFeedback.slice(0, 3).map((f) => (
                  <Avatar key={f.id} className="h-4 w-4 ring-1 ring-background">
                    <AvatarImage src={f.partner?.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px] bg-amber-500/20 text-amber-700">
                      {f.partner?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {questionFeedback.length > 3 && (
                <span className="text-[10px] text-amber-600 font-medium">
                  +{questionFeedback.length - 3}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium text-xs text-amber-600 flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                Partners questioning this:
              </p>
              <ul className="text-xs space-y-1.5">
                {questionFeedback.map(f => (
                  <li key={f.id} className="flex flex-col gap-0.5">
                    <span className="font-medium">{f.partner?.full_name}</span>
                    {f.comment && (
                      <span className="text-muted-foreground italic pl-2 border-l-2 border-amber-500/30">
                        "{f.comment}"
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};

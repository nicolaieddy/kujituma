import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThumbsUp, HelpCircle, MessageCircle } from "lucide-react";
import { ObjectiveFeedback } from "@/hooks/useObjectiveFeedback";
import { cn } from "@/lib/utils";

interface ObjectiveFeedbackIndicatorProps {
  agreeFeedback: ObjectiveFeedback[];
  questionFeedback: ObjectiveFeedback[];
  commentCount?: number;
  unreadCount?: number;
  onClick?: () => void;
}

export const ObjectiveFeedbackIndicator = ({
  agreeFeedback,
  questionFeedback,
  commentCount = 0,
  unreadCount = 0,
  onClick,
}: ObjectiveFeedbackIndicatorProps) => {
  if (agreeFeedback.length === 0 && questionFeedback.length === 0 && commentCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
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
                  <li key={f.id}>
                    <span className="font-medium">{f.partner?.full_name}</span>
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
                  <li key={f.id}>
                    <span className="font-medium">{f.partner?.full_name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Comment count badge */}
      {commentCount > 0 && (
        <div className="relative flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
          <MessageCircle className="h-3 w-3 text-primary" />
          <span className="text-[10px] text-primary font-medium">{commentCount}</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground px-0.5">
              {unreadCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

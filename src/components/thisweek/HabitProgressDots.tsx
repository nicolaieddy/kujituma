import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check } from "lucide-react";

interface HabitDotInfo {
  text: string;
  isCompleted: boolean;
}

interface HabitProgressDotsProps {
  habits: HabitDotInfo[];
}

export const HabitProgressDots = ({ habits }: HabitProgressDotsProps) => {
  return (
    <div className="flex items-center gap-1.5">
      {habits.map((habit, idx) => (
        <Tooltip key={idx}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "h-3 w-3 rounded-full flex items-center justify-center transition-colors",
                habit.isCompleted
                  ? "bg-success"
                  : "bg-muted-foreground/20 border border-muted-foreground/30"
              )}
            >
              {habit.isCompleted && (
                <Check className="h-2 w-2 text-success-foreground" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">
              {habit.text}: {habit.isCompleted ? "Done" : "Pending"}
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

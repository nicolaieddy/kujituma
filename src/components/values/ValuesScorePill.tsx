import { Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAllAlignments, useAllValueLinks } from "@/hooks/useGoalValueAlignment";
import { useValues } from "@/hooks/useValues";

interface Props {
  goalId: string;
  className?: string;
}

export const ValuesScorePill = ({ goalId, className }: Props) => {
  const { data: alignments = [] } = useAllAlignments();
  const { data: links = [] } = useAllValueLinks();
  const { values } = useValues();

  const alignment = alignments.find((a) => a.goal_id === goalId);
  if (!alignment || alignment.total_values === 0) return null;

  const score = alignment.score;
  const goalLinks = links.filter((l) => l.goal_id === goalId);
  const top = goalLinks
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((l) => values.find((v) => v.id === l.value_id)?.label)
    .filter(Boolean) as string[];

  const tone =
    score >= 60
      ? "border-primary/30 text-primary bg-primary/10"
      : score >= 30
      ? "border-accent/40 text-accent-foreground bg-accent/30"
      : "border-muted-foreground/20 text-muted-foreground bg-muted";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
            tone,
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Sparkles className="h-3 w-3" />
          {score}%
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px]">
        <p className="text-xs font-semibold mb-1">Values alignment: {score}%</p>
        {top.length > 0 ? (
          <p className="text-xs text-muted-foreground">Tied to: {top.join(", ")}</p>
        ) : (
          <p className="text-xs text-muted-foreground">No values tagged yet.</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

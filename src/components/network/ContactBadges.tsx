import { cn } from "@/lib/utils";

const strengthColors: Record<string, string> = {
  Cold: "bg-influence-cold/15 text-influence-cold",
  Warm: "bg-influence-warm/15 text-influence-warm",
  Strong: "bg-influence-strong/15 text-influence-strong",
  Trusted: "bg-influence-trusted/15 text-influence-trusted",
};

// Raw hex colors for map markers
export const strengthMapColors: Record<string, string> = {
  Cold: "#9ca3b0",
  Warm: "#d4922a",
  Strong: "#2b8bb5",
  Trusted: "#2b9a68",
};

export const RelationshipBadge = ({ strength }: { strength: string }) => (
  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", strengthColors[strength] || "bg-muted text-muted-foreground")}>
    {strength}
  </span>
);

const scoreLabel = (score: number): string => {
  if (score >= 4) return "High";
  if (score >= 2) return "Medium";
  return "Low";
};

const scoreColor = (score: number): string => {
  if (score >= 4) return "bg-primary/15 text-primary";
  if (score >= 2) return "bg-muted text-muted-foreground";
  return "bg-muted/50 text-muted-foreground";
};

export const InfluenceScore = ({ score }: { score: number }) => (
  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", scoreColor(score))}>
    {scoreLabel(score)}
  </span>
);

export const TypeBadge = ({ type }: { type: string }) => (
  <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
    {type}
  </span>
);

import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

interface BetaBadgeProps {
  className?: string;
  label?: string;
  /** When true, render a slightly larger pill suitable for page headers. */
  size?: "sm" | "md";
}

/**
 * Small amber "Beta" pill used to flag modules and pages that are still
 * being built. Visually distinct from the neutral shadcn <Badge variant="secondary"/>.
 */
export function BetaBadge({ className, label = "Beta", size = "sm" }: BetaBadgeProps) {
  const sizing =
    size === "md"
      ? "text-xs px-2.5 py-1 gap-1.5"
      : "text-[10px] px-1.5 py-0.5 gap-1";
  const iconSize = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium uppercase tracking-wide",
        "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30",
        sizing,
        className,
      )}
      title="In beta — actively being built"
    >
      <FlaskConical className={iconSize} />
      {label}
    </span>
  );
}

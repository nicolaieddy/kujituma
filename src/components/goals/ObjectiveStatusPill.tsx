import { Circle, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_META, deriveStatus } from "@/lib/objectiveStatus";
import type { ObjectiveStatus, WeeklyObjective } from "@/types/weeklyProgress";

interface Props {
  objective: Pick<WeeklyObjective, "status" | "is_completed">;
  disabled?: boolean;
  onChange: (status: ObjectiveStatus) => void;
  size?: "sm" | "md";
}

const ICONS: Record<ObjectiveStatus, React.ComponentType<{ className?: string }>> = {
  not_started: Circle,
  in_progress: Loader2,
  done: CheckCircle2,
};

const ORDER: ObjectiveStatus[] = ["not_started", "in_progress", "done"];

/**
 * Compact segmented control to set objective status from list view.
 * 3 icon buttons in a single pill. Quietly hidden on read-only states.
 */
export function ObjectiveStatusPill({ objective, disabled, onChange, size = "sm" }: Props) {
  const current = deriveStatus(objective);
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const btn = size === "sm" ? "h-6 w-6" : "h-7 w-7";

  return (
    <div
      role="radiogroup"
      aria-label="Objective status"
      className={cn(
        "inline-flex items-center gap-0.5 p-0.5 rounded-full border border-border bg-background",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      {ORDER.map((s) => {
        const Icon = ICONS[s];
        const isActive = current === s;
        const meta = STATUS_META[s];
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={meta.label}
            title={meta.label}
            onClick={(e) => {
              e.stopPropagation();
              if (!isActive) onChange(s);
            }}
            className={cn(
              "flex items-center justify-center rounded-full transition-colors",
              btn,
              isActive
                ? s === "done"
                  ? "bg-primary text-primary-foreground"
                  : s === "in_progress"
                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                  : "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className={cn(dim, isActive && s === "in_progress" && "animate-spin-slow")} />
          </button>
        );
      })}
    </div>
  );
}

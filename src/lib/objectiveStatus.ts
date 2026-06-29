import type { ObjectiveStatus, WeeklyObjective } from "@/types/weeklyProgress";

export const STATUS_COLUMNS: ObjectiveStatus[] = ["not_started", "in_progress", "done"];

export const STATUS_META: Record<
  ObjectiveStatus,
  { label: string; accent: string; dot: string; description: string }
> = {
  not_started: {
    label: "Not Started",
    accent: "border-l-muted-foreground/40",
    dot: "bg-muted-foreground/50",
    description: "Haven't started yet",
  },
  in_progress: {
    label: "In Progress",
    accent: "border-l-blue-500/70",
    dot: "bg-blue-500",
    description: "Actively working on this",
  },
  done: {
    label: "Done",
    accent: "border-l-primary",
    dot: "bg-primary",
    description: "Completed",
  },
};

/**
 * Derive status from a row even if the column isn't populated yet
 * (defensive — DB trigger keeps these in sync, but pre-fetch caches may lag).
 */
export function deriveStatus(o: Pick<WeeklyObjective, "status" | "is_completed">): ObjectiveStatus {
  if (o.status) return o.status;
  return o.is_completed ? "done" : "not_started";
}

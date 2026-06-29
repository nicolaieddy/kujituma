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
 * Status is the single source of truth. This wrapper exists for legacy
 * call sites and to gracefully default missing values to 'not_started'.
 */
export function deriveStatus(o: Pick<WeeklyObjective, "status">): ObjectiveStatus {
  return o.status ?? "not_started";
}

export function isObjectiveDone(o: Pick<WeeklyObjective, "status">): boolean {
  return o.status === "done";
}

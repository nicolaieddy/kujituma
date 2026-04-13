/**
 * Counts objectives that were moved/rescheduled to another week.
 * These are stored in incomplete_reflections with a "[MOVED]" prefix.
 */
export function countMovedObjectives(
  incompleteReflections: Record<string, string> | null | undefined
): number {
  if (!incompleteReflections) return 0;
  return Object.values(incompleteReflections).filter(
    (v) => typeof v === "string" && v.startsWith("[MOVED]")
  ).length;
}

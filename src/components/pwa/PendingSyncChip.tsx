import { CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PendingSyncChipProps {
  /** When true, shows the smaller "syncing" variant instead of "pending". */
  syncing?: boolean;
  className?: string;
  label?: string;
}

/**
 * Small amber chip used to flag an item that was saved locally and is
 * waiting to be synced to the server. Pair with `pendingSyncAccent` on the
 * parent container for the left-accent border treatment.
 */
export const PendingSyncChip = ({ syncing, className, label }: PendingSyncChipProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300",
        className,
      )}
      role="status"
      aria-label={syncing ? "Syncing" : "Pending sync"}
      title={syncing ? "Syncing to server…" : "Saved offline — will sync when you're back online"}
    >
      {syncing ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : (
        <CloudOff className="h-3 w-3" />
      )}
      {label ?? (syncing ? "Syncing" : "Pending sync")}
    </span>
  );
};

/** Tailwind classes to apply to an item container that has unsynced changes. */
export const pendingSyncAccent =
  "border-l-2 border-l-amber-500/70 bg-amber-500/[0.04]";

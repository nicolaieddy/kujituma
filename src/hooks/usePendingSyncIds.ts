import { useEffect, useState } from "react";
import { offlineSyncService } from "@/services/offlineSyncService";

/**
 * Returns the set of record IDs (by table) currently queued for offline sync.
 * Use to flag list items with a "Pending sync" indicator.
 */
export function usePendingSyncIds(table: string): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const queue = await offlineSyncService.getQueue();
      if (cancelled) return;
      const next = new Set<string>();
      for (const m of queue) {
        if (m.table !== table) continue;
        const id =
          m.type === "create"
            ? m.data?.id
            : m.data?.id ?? m.data?.updates?.id;
        if (id) next.add(id);
      }
      setIds(next);
    };
    refresh();
    const unsub = offlineSyncService.subscribe(refresh);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [table]);

  return ids;
}

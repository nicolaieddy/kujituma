import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { ModuleId } from "@/modules/types";

const DEFAULT_PIN_LIMIT = 4;

type Prefs = {
  order: ModuleId[]; // user-defined order (only contains ids ever seen)
  pinned: ModuleId[]; // subset of order that's pinned in the bar
};

const emptyPrefs: Prefs = { order: [], pinned: [] };

const keyFor = (uid: string | undefined) =>
  `kujituma:nav:modulePrefs:${uid ?? "anon"}`;

function read(uid: string | undefined): Prefs {
  try {
    const raw = localStorage.getItem(keyFor(uid));
    if (!raw) return emptyPrefs;
    const parsed = JSON.parse(raw);
    return {
      order: Array.isArray(parsed.order) ? parsed.order : [],
      pinned: Array.isArray(parsed.pinned) ? parsed.pinned : [],
    };
  } catch {
    return emptyPrefs;
  }
}

function write(uid: string | undefined, prefs: Prefs) {
  try {
    localStorage.setItem(keyFor(uid), JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/**
 * Manages user-customizable ordering + pinning of MODULE nav items.
 * Core nav items (Goals, Friends, Analytics, Modules, Admin) are not user-configurable.
 *
 * - Newly-installed modules are auto-pinned up to DEFAULT_PIN_LIMIT, then overflow into "More".
 * - Ordering is persisted in localStorage per user.
 */
export function useModuleNavPrefs(installedModuleIds: ModuleId[]) {
  const { user } = useAuth();
  const uid = user?.id;
  const [prefs, setPrefs] = useState<Prefs>(() => read(uid));

  useEffect(() => {
    setPrefs(read(uid));
  }, [uid]);

  // Reconcile: ensure every installed id is in order; drop uninstalled from pinned.
  const installedSet = new Set(installedModuleIds);
  const knownOrder = prefs.order.filter((id) => installedSet.has(id));
  const newIds = installedModuleIds.filter((id) => !prefs.order.includes(id));
  const order: ModuleId[] = [...knownOrder, ...newIds];

  // Auto-pin new modules up to limit
  const pinnedSet = new Set(prefs.pinned.filter((id) => installedSet.has(id)));
  for (const id of newIds) {
    if (pinnedSet.size < DEFAULT_PIN_LIMIT) pinnedSet.add(id);
  }
  const pinned = order.filter((id) => pinnedSet.has(id));
  const overflow = order.filter((id) => !pinnedSet.has(id));

  const persist = useCallback(
    (next: Prefs) => {
      setPrefs(next);
      write(uid, next);
    },
    [uid],
  );

  const togglePin = useCallback(
    (id: ModuleId) => {
      const isPinned = pinnedSet.has(id);
      const nextPinned = isPinned
        ? pinned.filter((p) => p !== id)
        : [...pinned, id];
      persist({ order, pinned: nextPinned });
    },
    [order, pinned, pinnedSet, persist],
  );

  const reorder = useCallback(
    (nextOrder: ModuleId[]) => {
      persist({ order: nextOrder, pinned: nextOrder.filter((id) => pinnedSet.has(id)) });
    },
    [persist, pinnedSet],
  );

  return { order, pinned, overflow, togglePin, reorder };
}

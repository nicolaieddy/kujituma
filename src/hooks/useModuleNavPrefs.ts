import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { ModuleId } from "@/modules/types";

const DEFAULT_PIN_LIMIT = 4;

type Prefs = {
  order: ModuleId[];
  pinned: ModuleId[];
};

const emptyPrefs: Prefs = { order: [], pinned: [] };
const cacheKey = (uid: string | undefined) =>
  `kujituma:nav:modulePrefs:${uid ?? "anon"}`;

function readCache(uid: string | undefined): Prefs {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
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

function writeCache(uid: string | undefined, prefs: Prefs) {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/**
 * Manages user-customizable ordering + pinning of MODULE nav items.
 *
 * Persistence strategy:
 *   1. localStorage cache for instant render and offline fallback.
 *   2. Supabase `user_nav_preferences` row (owner-only RLS) for cross-device sync.
 *      Loaded once on auth, written on every change (fire-and-forget upsert).
 */
export function useModuleNavPrefs(installedModuleIds: ModuleId[]) {
  const { user } = useAuth();
  const uid = user?.id;
  const [prefs, setPrefs] = useState<Prefs>(() => readCache(uid));
  const [loaded, setLoaded] = useState(false);

  // Reset cache when user changes
  useEffect(() => {
    setPrefs(readCache(uid));
    setLoaded(false);
  }, [uid]);

  // Hydrate from Supabase (cache wins for instant render; remote overrides once loaded)
  useEffect(() => {
    if (!uid || loaded) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_nav_preferences")
        .select("module_order, module_pinned")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data) {
        const remote: Prefs = {
          order: (data.module_order ?? []) as ModuleId[],
          pinned: (data.module_pinned ?? []) as ModuleId[],
        };
        setPrefs(remote);
        writeCache(uid, remote);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, loaded]);

  // Reconcile against installed modules
  const installedSet = new Set(installedModuleIds);
  const knownOrder = prefs.order.filter((id) => installedSet.has(id));
  const newIds = installedModuleIds.filter((id) => !prefs.order.includes(id));
  const order: ModuleId[] = [...knownOrder, ...newIds];

  const pinnedSet = new Set(prefs.pinned.filter((id) => installedSet.has(id)));
  for (const id of newIds) {
    if (pinnedSet.size < DEFAULT_PIN_LIMIT) pinnedSet.add(id);
  }
  const pinned = order.filter((id) => pinnedSet.has(id));
  const overflow = order.filter((id) => !pinnedSet.has(id));

  const persist = useCallback(
    (next: Prefs) => {
      setPrefs(next);
      writeCache(uid, next);
      if (!uid) return;
      // Fire-and-forget remote sync
      supabase
        .from("user_nav_preferences")
        .upsert(
          {
            user_id: uid,
            module_order: next.order,
            module_pinned: next.pinned,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
        .then(({ error }) => {
          if (error) console.warn("[nav prefs] sync failed:", error.message);
        });
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
      persist({
        order: nextOrder,
        pinned: nextOrder.filter((id) => pinnedSet.has(id)),
      });
    },
    [persist, pinnedSet],
  );

  return { order, pinned, overflow, togglePin, reorder };
}

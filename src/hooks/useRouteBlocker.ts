import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { UNSAFE_NavigationContext, useLocation } from "react-router-dom";

type BlockerState = "unblocked" | "blocked";

type BlockerArgs = {
  currentLocation: ReturnType<typeof useLocation>;
  nextLocation: ReturnType<typeof useLocation>;
};

type Transition = {
  location: ReturnType<typeof useLocation>;
  retry: () => void;
};

/**
 * BrowserRouter-safe replacement for react-router's useBlocker (data routers only).
 * Keeps the same minimal surface: { state, reset, proceed }.
 * 
 * This is a no-op in environments where navigator.block is not available.
 */
export const useRouteBlocker = (shouldBlock: (args: BlockerArgs) => boolean) => {
  const location = useLocation();
  const navContext = useContext(UNSAFE_NavigationContext);
  const navigator = navContext?.navigator as { 
    block?: (cb: (tx: Transition) => void) => () => void 
  } | undefined;

  const [state, setState] = useState<BlockerState>("unblocked");
  const txRef = useRef<Transition | null>(null);
  const allowNextRef = useRef(false);
  const shouldBlockRef = useRef(shouldBlock);
  
  // Keep shouldBlock ref updated to avoid stale closures
  shouldBlockRef.current = shouldBlock;

  const reset = useCallback(() => {
    txRef.current = null;
    setState("unblocked");
  }, []);

  const proceed = useCallback(() => {
    const tx = txRef.current;
    if (!tx) return;
    allowNextRef.current = true;
    txRef.current = null;
    setState("unblocked");
    tx.retry();
  }, []);

  useEffect(() => {
    // If no navigator.block available, do nothing (not a blocking router)
    if (!navigator?.block) return;

    let unblock: (() => void) | undefined;
    
    try {
      unblock = navigator.block((tx: Transition) => {
        if (allowNextRef.current) {
          allowNextRef.current = false;
          tx.retry();
          return;
        }

        const nextLocation = tx.location;
        const currentLocation = location;

        if (shouldBlockRef.current({ currentLocation, nextLocation })) {
          txRef.current = tx;
          setState("blocked");
          return;
        }

        tx.retry();
      });
    } catch (err) {
      console.warn('[useRouteBlocker] Failed to set up blocker:', err);
    }

    return () => {
      if (unblock) {
        try {
          unblock();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [navigator, location]);

  return { state, reset, proceed };
};

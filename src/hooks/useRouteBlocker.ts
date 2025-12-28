import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  UNSAFE_NavigationContext,
  useLocation,
} from "react-router-dom";

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
 */
export const useRouteBlocker = (shouldBlock: (args: BlockerArgs) => boolean) => {
  const location = useLocation();
  const { navigator } = useContext(UNSAFE_NavigationContext) as unknown as {
    navigator: { block?: (cb: (tx: Transition) => void) => () => void };
  };

  const [state, setState] = useState<BlockerState>("unblocked");
  const txRef = useRef<Transition | null>(null);
  const allowNextRef = useRef(false);

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
    if (!navigator?.block) return;

    const unblock = navigator.block((tx: Transition) => {
      if (allowNextRef.current) {
        allowNextRef.current = false;
        tx.retry();
        return;
      }

      const nextLocation = tx.location;
      const currentLocation = location;

      if (shouldBlock({ currentLocation, nextLocation })) {
        txRef.current = tx;
        setState("blocked");
        return;
      }

      tx.retry();
    });

    return unblock;
  }, [navigator, location, shouldBlock]);

  return { state, reset, proceed };
};

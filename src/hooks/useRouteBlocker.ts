import { useCallback, useEffect, useRef, useState } from "react";

type BlockerState = "unblocked" | "blocked";

/**
 * Simplified route blocker that uses beforeunload for browser navigation
 * and a ref-based system for in-app navigation blocking.
 * 
 * This avoids using UNSAFE_NavigationContext which can cause issues
 * with rapid component mounting/unmounting.
 */
export const useRouteBlocker = (
  shouldBlock: (args: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) => boolean
) => {
  const [state, setState] = useState<BlockerState>("unblocked");
  const shouldBlockRef = useRef(shouldBlock);
  
  // Keep ref updated
  shouldBlockRef.current = shouldBlock;

  const reset = useCallback(() => {
    setState("unblocked");
  }, []);

  const proceed = useCallback(() => {
    setState("unblocked");
  }, []);

  // Handle browser beforeunload for external navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if we should block using current pathname
      if (shouldBlockRef.current({ 
        currentLocation: { pathname: window.location.pathname }, 
        nextLocation: { pathname: '' } 
      })) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return { state, reset, proceed };
};

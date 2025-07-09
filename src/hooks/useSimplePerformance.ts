import { useCallback } from 'react';

export const useSimplePerformance = () => {
  // Simple performance tracking without overhead
  const trackAction = useCallback((action: string) => {
    // Only track in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`Action: ${action} at ${Date.now()}`);
    }
  }, []);

  const measureTime = useCallback(<T>(name: string, fn: () => T): T => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`${name}: ${end - start}ms`);
    }
    
    return result;
  }, []);

  return {
    trackAction,
    measureTime
  };
};
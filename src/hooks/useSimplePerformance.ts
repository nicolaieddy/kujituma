import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  mountTime?: number;
}

export const useSimplePerformance = (componentName: string) => {
  const startTime = useRef(performance.now());
  const mountTime = useRef<number | null>(null);

  useEffect(() => {
    mountTime.current = performance.now() - startTime.current;
    
    // Only log if mount time is concerning (>100ms)
    if (mountTime.current > 100) {
      console.warn(`🐌 Slow component mount: ${componentName} took ${mountTime.current.toFixed(2)}ms`);
    }
  }, [componentName]);

  useEffect(() => {
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - startTime.current;
    
    // Reset for next render
    startTime.current = performance.now();
    
    return () => {
      // Only log if render time is concerning (>50ms)
      if (renderTime > 50) {
        console.warn(`🐌 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  return {
    componentName,
    mountTime: mountTime.current,
  };
};
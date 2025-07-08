import { useEffect, useCallback } from 'react';
import { backgroundSyncService } from '@/services/backgroundSyncService';
import { cacheService } from '@/services/cacheService';

export const usePerformanceOptimizations = () => {
  // Track page views
  useEffect(() => {
    backgroundSyncService.trackEvent('page_view', {
      path: window.location.pathname,
      timestamp: new Date().toISOString()
    });
  }, []);

  // Track user interactions
  const trackInteraction = useCallback((action: string, target?: string) => {
    backgroundSyncService.trackUserActivity('interaction', {
      action,
      target,
      timestamp: new Date().toISOString()
    });
  }, []);

  // Track performance metrics
  const trackPerformance = useCallback((metric: string, value: number, unit: string = 'ms') => {
    backgroundSyncService.trackEvent('performance_metric', {
      metric,
      value,
      unit,
      timestamp: new Date().toISOString()
    });
  }, []);

  // Preload critical resources
  const preloadResource = useCallback((url: string, type: 'image' | 'fetch' = 'fetch') => {
    if (type === 'image') {
      const img = new Image();
      img.src = url;
    } else {
      // Preload data
      fetch(url, { method: 'HEAD' }).catch(() => {
        // Ignore errors for preload
      });
    }
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return cacheService.getStats();
  }, []);

  // Get background sync status
  const getSyncStatus = useCallback(() => {
    return backgroundSyncService.getStatus();
  }, []);

  return {
    trackInteraction,
    trackPerformance,
    preloadResource,
    getCacheStats,
    getSyncStatus
  };
};
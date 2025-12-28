import { useState, useEffect } from 'react';
import { offlineSyncService } from '@/services/offlineSyncService';
import { offlineDataService } from '@/services/offlineDataService';

export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to sync queue changes
    const unsubscribe = offlineSyncService.subscribe(async () => {
      const count = await offlineSyncService.getPendingCount();
      setPendingCount(count);
      setIsSyncing(offlineSyncService.syncing);
    });

    // Get initial values
    offlineSyncService.getPendingCount().then(setPendingCount);
    offlineDataService.getLastSync().then(timestamp => {
      if (timestamp) setLastSync(new Date(timestamp));
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    pendingCount,
    isSyncing,
    lastSync,
    isCached: !isOnline,
  };
};

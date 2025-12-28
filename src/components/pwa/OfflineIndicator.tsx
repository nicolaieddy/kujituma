import { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi, Database, RefreshCw, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { offlineDataService } from '@/services/offlineDataService';
import { offlineSyncService } from '@/services/offlineSyncService';
import { toast } from '@/hooks/use-toast';

export const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      setIsSyncing(true);
      
      // Show toast when coming back online
      toast({
        title: "You're back online",
        description: pendingCount > 0 
          ? `Syncing ${pendingCount} pending change${pendingCount !== 1 ? 's' : ''}...`
          : "Connection restored",
        duration: 3000,
      });
      
      // Trigger sync
      await offlineSyncService.processQueue();
      const count = await offlineSyncService.getPendingCount();
      setPendingCount(count);
      setIsSyncing(false);
      
      // Update last sync
      offlineDataService.updateLastSync();
      
      // Keep showing briefly to indicate connection restored
      setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowIndicator(true);
      
      // Show toast when going offline
      toast({
        title: "You're offline",
        description: "Some features may be limited. Changes will sync when you reconnect.",
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to queue changes
    const unsubscribe = offlineSyncService.subscribe(async () => {
      const count = await offlineSyncService.getPendingCount();
      setPendingCount(count);
      setIsSyncing(offlineSyncService.syncing);
    });

    // Set initial state (no toast on initial load)
    if (!navigator.onLine && !hasInitialized.current) {
      setShowIndicator(true);
    }
    hasInitialized.current = true;

    // Get initial values
    offlineDataService.getLastSync().then((timestamp) => {
      if (timestamp) setLastSync(new Date(timestamp));
    });
    offlineSyncService.getPendingCount().then(setPendingCount);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [pendingCount]);

  if (!showIndicator && pendingCount === 0) return null;

  const formatLastSync = () => {
    if (!lastSync) return '';
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Show pending sync indicator even when online
  if (!isOffline && pendingCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium bg-amber-500 text-amber-950 transition-all duration-300">
        <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
        <span>
          {isSyncing 
            ? `Syncing ${pendingCount} change${pendingCount !== 1 ? 's' : ''}...` 
            : `${pendingCount} change${pendingCount !== 1 ? 's' : ''} pending sync`}
        </span>
      </div>
    );
  }

  if (!showIndicator) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-all duration-300",
        isOffline 
          ? "bg-amber-500 text-amber-950" 
          : "bg-primary text-primary-foreground"
      )}
    >
      {isOffline ? (
        <>
          <CloudOff className="h-4 w-4" />
          <span>Offline mode</span>
          {pendingCount > 0 && (
            <>
              <span className="mx-1">•</span>
              <span>{pendingCount} pending</span>
            </>
          )}
          <Database className="h-3 w-3 ml-2" />
          <span className="text-xs opacity-80">
            {lastSync ? `Cached ${formatLastSync()}` : 'Using cached data'}
          </span>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4" />
          <span>Back online</span>
          {isSyncing && (
            <>
              <RefreshCw className="h-3 w-3 ml-1 animate-spin" />
              <span className="text-xs">syncing...</span>
            </>
          )}
        </>
      )}
    </div>
  );
};

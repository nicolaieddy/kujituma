import { useState, useEffect } from 'react';
import { WifiOff, Wifi, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { offlineDataService } from '@/services/offlineDataService';

export const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Keep showing briefly to indicate connection restored
      setTimeout(() => setShowIndicator(false), 3000);
      // Update last sync
      offlineDataService.updateLastSync();
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    if (!navigator.onLine) {
      setShowIndicator(true);
    }

    // Get last sync time
    offlineDataService.getLastSync().then((timestamp) => {
      if (timestamp) {
        setLastSync(new Date(timestamp));
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showIndicator) return null;

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
          <WifiOff className="h-4 w-4" />
          <span>Offline mode</span>
          <Database className="h-3 w-3 ml-1" />
          <span className="text-xs opacity-80">
            {lastSync ? `Cached ${formatLastSync()}` : 'Using cached data'}
          </span>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4" />
          <span>Back online - syncing...</span>
        </>
      )}
    </div>
  );
};

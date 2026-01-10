import { useState, useEffect } from 'react';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { offlineSyncService } from '@/services/offlineSyncService';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Shows a badge with the count of offline changes waiting to sync.
 * Only visible when there are pending changes or when syncing.
 */
export const PendingSyncBadge = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

    // Get initial count
    offlineSyncService.getPendingCount().then(setPendingCount);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  // Don't show if online and no pending changes and not syncing
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  // Removed nested TooltipProvider - using App-level provider to prevent stack overflow on iOS Safari
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative">
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : isOnline ? (
            <Cloud className="h-4 w-4 text-muted-foreground" />
          ) : (
            <CloudOff className="h-4 w-4 text-warning" />
          )}
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className={cn(
                "absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] font-medium",
                "flex items-center justify-center rounded-full"
              )}
            >
              {pendingCount > 99 ? '99+' : pendingCount}
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {isSyncing ? (
          'Syncing changes...'
        ) : isOnline ? (
          pendingCount > 0 
            ? `${pendingCount} change${pendingCount !== 1 ? 's' : ''} syncing...`
            : 'All changes synced'
        ) : (
          pendingCount > 0
            ? `${pendingCount} change${pendingCount !== 1 ? 's' : ''} pending • Offline`
            : 'You are offline'
        )}
      </TooltipContent>
    </Tooltip>
  );
};

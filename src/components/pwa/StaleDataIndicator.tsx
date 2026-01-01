import { RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StaleDataIndicatorProps {
  isCached: boolean;
  isRefetching?: boolean;
  lastSyncTime?: Date | null;
  onRefresh?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Visual indicator for stale/cached data.
 * Shows when data is from cache and offers refresh option.
 */
export const StaleDataIndicator = ({
  isCached,
  isRefetching = false,
  lastSyncTime,
  onRefresh,
  className,
  compact = false,
}: StaleDataIndicatorProps) => {
  if (!isCached && !isRefetching) return null;

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (compact) {
    return (
      <button
        onClick={onRefresh}
        disabled={isRefetching}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
          "transition-colors",
          isCached 
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            : "bg-muted text-muted-foreground",
          className
        )}
      >
        {isRefetching ? (
          <>
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Syncing...</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span>Cached</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
        "border transition-colors",
        isCached 
          ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300"
          : "bg-muted border-border text-muted-foreground",
        className
      )}
    >
      {isCached ? (
        <WifiOff className="h-4 w-4 flex-shrink-0" />
      ) : (
        <Clock className="h-4 w-4 flex-shrink-0" />
      )}
      
      <div className="flex-1 min-w-0">
        <span className="font-medium">
          {isCached ? "Viewing cached data" : "Refreshing..."}
        </span>
        {lastSyncTime && !isRefetching && (
          <span className="text-xs opacity-75 ml-1">
            · Last synced {formatLastSync(lastSyncTime)}
          </span>
        )}
      </div>
      
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefetching}
          className="h-7 px-2"
        >
          <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
        </Button>
      )}
    </div>
  );
};

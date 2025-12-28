import { RefreshCw, Check, Database, Wifi, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  progress: number;
  pullDistance: number;
  isCached?: boolean;
  isOffline?: boolean;
}

export const PullToRefreshIndicator = ({
  isPulling,
  isRefreshing,
  progress,
  pullDistance,
  isCached = false,
  isOffline = false,
}: PullToRefreshIndicatorProps) => {
  const isVisible = isPulling || isRefreshing;
  const isReady = progress >= 100;

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none",
        "transition-all duration-200 ease-out"
      )}
      style={{
        top: Math.min(pullDistance * 0.5, 60) + 16,
        opacity: isPulling ? Math.min(progress / 50, 1) : 1,
      }}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-md",
          "border transition-all duration-300",
          isRefreshing
            ? "bg-primary/90 text-primary-foreground border-primary/50"
            : isReady
            ? "bg-primary/80 text-primary-foreground border-primary/40"
            : "bg-background/90 text-foreground border-border/50"
        )}
      >
        {/* Icon */}
        <div className="relative">
          {isRefreshing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : isReady ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <div className="h-4 w-4 relative">
              <svg className="h-4 w-4 -rotate-90" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity="0.2"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${(progress / 100) * 62.8} 62.8`}
                  className="transition-all duration-100"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Text */}
        <span className="text-sm font-medium whitespace-nowrap">
          {isRefreshing
            ? "Refreshing..."
            : isReady
            ? "Release to refresh"
            : "Pull to refresh"}
        </span>

        {/* Status indicator */}
        {!isRefreshing && (
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
              isOffline
                ? "bg-destructive/20 text-destructive"
                : isCached
                ? "bg-amber-500/20 text-amber-600"
                : "bg-green-500/20 text-green-600"
            )}
          >
            {isOffline ? (
              <>
                <CloudOff className="h-3 w-3" />
                <span>Offline</span>
              </>
            ) : isCached ? (
              <>
                <Database className="h-3 w-3" />
                <span>Cached</span>
              </>
            ) : (
              <>
                <Wifi className="h-3 w-3" />
                <span>Live</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Wrapper component that shows refresh result feedback
export const RefreshFeedback = ({
  show,
  isFromCache,
  onComplete,
}: {
  show: boolean;
  isFromCache: boolean;
  onComplete: () => void;
}) => {
  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed left-1/2 -translate-x-1/2 top-20 z-50",
        "animate-fade-in"
      )}
      onAnimationEnd={() => {
        setTimeout(onComplete, 1500);
      }}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-md border",
          isFromCache
            ? "bg-amber-500/90 text-white border-amber-400/50"
            : "bg-green-500/90 text-white border-green-400/50"
        )}
      >
        <Check className="h-4 w-4" />
        <span className="text-sm font-medium">
          {isFromCache ? "Loaded from cache" : "Data refreshed"}
        </span>
      </div>
    </div>
  );
};

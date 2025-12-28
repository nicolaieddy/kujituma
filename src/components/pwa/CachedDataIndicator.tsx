import { Database, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CachedDataIndicatorProps {
  isCached: boolean;
  lastSync?: Date | null;
  className?: string;
}

export const CachedDataIndicator = ({ 
  isCached, 
  lastSync,
  className 
}: CachedDataIndicatorProps) => {
  if (!isCached) return null;

  const formatLastSync = () => {
    if (!lastSync) return 'Unknown';
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
              className
            )}
          >
            <Database className="h-3 w-3" />
            <span>Cached</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-xs">
            <p className="font-medium">Viewing offline data</p>
            <p className="text-muted-foreground">
              Last synced: {formatLastSync()}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

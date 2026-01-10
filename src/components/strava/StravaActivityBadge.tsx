import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface StravaActivityBadgeProps {
  activityName: string;
  activityType: string;
  durationSeconds?: number;
  distanceMeters?: number;
  className?: string;
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(meters)}m`;
};

export function StravaActivityBadge({ 
  activityName, 
  activityType,
  durationSeconds,
  distanceMeters,
  className 
}: StravaActivityBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "inline-flex items-center justify-center cursor-help",
          className
        )}>
          <svg 
            viewBox="0 0 24 24" 
            className="h-3.5 w-3.5" 
            fill="#FC4C02"
          >
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-medium flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="#FC4C02">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            {activityName}
          </p>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Type: {activityType}</p>
            {durationSeconds && durationSeconds > 0 && (
              <p>Duration: {formatDuration(durationSeconds)}</p>
            )}
            {distanceMeters && distanceMeters > 0 && (
              <p>Distance: {formatDistance(distanceMeters)}</p>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/70 pt-1 border-t border-border/50">
            Auto-tracked from Strava
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
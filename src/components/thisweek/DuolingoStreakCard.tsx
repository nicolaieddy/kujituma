import { useDuolingoConnection } from "@/hooks/useDuolingoConnection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Flame, RefreshCw, Loader2, Clock, Zap, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface DuolingoStreakCardProps {
  className?: string;
}

export const DuolingoStreakCard = ({ className }: DuolingoStreakCardProps) => {
  const { 
    isConnected, 
    connection, 
    isLoading, 
    isSyncing,
    syncActivities,
    lastSyncDisplay
  } = useDuolingoConnection();

  // Don't render if not connected
  if (!isConnected || !connection || isLoading) {
    return null;
  }

  const streak = connection.current_streak || 0;
  const streakMaintainedToday = streak > 0;

  return (
    <Card className={cn(
      "border-[#58CC02]/30 bg-gradient-to-br from-[#58CC02]/5 to-[#89E219]/5",
      className
    )}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Duolingo owl */}
            <div className="w-10 h-10 rounded-full bg-[#58CC02] flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🦉</span>
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">Duolingo</p>
                {streakMaintainedToday && (
                  <Badge variant="outline" className="bg-[#58CC02]/10 border-[#58CC02]/30 text-[#58CC02] gap-1 text-xs">
                    <Check className="h-3 w-3" />
                    Today
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1 text-[#FF9600] font-medium">
                  <Flame className="h-3.5 w-3.5" />
                  {streak} day streak
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  {connection.total_xp?.toLocaleString() || 0} XP
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Last sync time */}
            {lastSyncDisplay && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                    <Clock className="h-3 w-3" />
                    {lastSyncDisplay}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Last synced {lastSyncDisplay}</p>
                  <p className="text-xs text-muted-foreground">Auto-syncs every 6 hours</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Sync button */}
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => syncActivities()}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
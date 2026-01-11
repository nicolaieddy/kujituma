import { format, parseISO } from "date-fns";
import { ArrowRight, Clock, Target, RefreshCw } from "lucide-react";
import { useCarryOverLogs } from "@/hooks/useCarryOverLogs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";

const formatWeekLabel = (weekStart: string) => {
  const date = parseISO(weekStart);
  return format(date, "MMM d");
};

export const CarryOverActivityLog = () => {
  const { logs, isLoading, refetch } = useCarryOverLogs(30);
  const [isOpen, setIsOpen] = useState(false);

  // Group logs by date
  const groupedLogs = logs.reduce((acc, log) => {
    const date = format(parseISO(log.created_at), "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, typeof logs>);

  const sortedDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border bg-card">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <History className="h-4 w-4 text-muted-foreground" />
              <span>Carry-Over Activity Log</span>
              {logs.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({logs.length} recent)
                </span>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t">
            <div className="flex items-center justify-end p-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>

            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No carry-over activity yet
                </div>
              ) : (
                <div className="p-2">
                  {sortedDates.map((date) => (
                    <div key={date} className="mb-4">
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground sticky top-0 bg-card">
                        {format(parseISO(date), "EEEE, MMMM d, yyyy")}
                      </div>
                      <div className="space-y-1">
                        {groupedLogs[date].map((log) => (
                          <div
                            key={log.id}
                            className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                          >
                            <div className="mt-0.5 p-1.5 rounded-full bg-primary/10">
                              <ArrowRight className="h-3 w-3 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {log.objective_text}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(parseISO(log.created_at), "h:mm a")}
                                </span>
                                <span className="text-muted-foreground/50">•</span>
                                <span className="flex items-center gap-1">
                                  {formatWeekLabel(log.source_week_start)}
                                  <ArrowRight className="h-3 w-3" />
                                  {formatWeekLabel(log.target_week_start)}
                                </span>
                                {log.goal_title && (
                                  <>
                                    <span className="text-muted-foreground/50">•</span>
                                    <span className="flex items-center gap-1 truncate">
                                      <Target className="h-3 w-3" />
                                      {log.goal_title}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

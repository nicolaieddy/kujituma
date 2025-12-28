import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAllWeeklyPlanningSessions } from "@/hooks/useAllWeeklyPlanningSessions";
import { useWeeklyPlanning } from "@/hooks/useWeeklyPlanning";
import { useRitualsTrigger } from "@/contexts/RitualsContext";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { PlanningTrendsChart } from "@/components/rituals/PlanningTrendsChart";
import { Target, Lightbulb, Plus, CheckCircle, Clock } from "lucide-react";
import { format, parseISO, getISOWeek } from "date-fns";

export const WeeklyPlanningHistory = () => {
  const { sessions, isLoading } = useAllWeeklyPlanningSessions();
  const currentWeekStart = WeeklyProgressService.getWeekStart();
  const { planningSession: currentSession } = useWeeklyPlanning(currentWeekStart);
  const { isWeeklyHistoryOpen, setWeeklyHistoryOpen, openWeeklyPlanning } = useRitualsTrigger();

  const handleStartPlanning = () => {
    setWeeklyHistoryOpen(false);
    openWeeklyPlanning();
  };

  const getWeekLabel = (weekStart: string) => {
    const date = parseISO(weekStart);
    const weekNum = getISOWeek(date);
    return `Week ${weekNum}`;
  };

  const getWeekRange = (weekStart: string) => {
    const start = parseISO(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };

  return (
    <Sheet open={isWeeklyHistoryOpen} onOpenChange={setWeeklyHistoryOpen}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            📋 Weekly Planning Sessions
          </SheetTitle>
          <SheetDescription>
            Your weekly reflections and intentions
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Current Week Card */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  {getWeekLabel(currentWeekStart)}
                </CardTitle>
                <Badge variant={currentSession?.is_completed ? "default" : "secondary"}>
                  {currentSession?.is_completed ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Completed</>
                  ) : currentSession ? (
                    <><Clock className="h-3 w-3 mr-1" /> In Progress</>
                  ) : (
                    "Not Started"
                  )}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{getWeekRange(currentWeekStart)}</p>
            </CardHeader>
            <CardContent>
              {currentSession?.is_completed ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={handleStartPlanning}
                >
                  View Plan
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={handleStartPlanning}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {currentSession ? "Continue Planning" : "Start Planning"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Analytics Charts */}
          {sessions.length > 1 && (
            <PlanningTrendsChart sessions={sessions} />
          )}

          {/* Past Sessions */}
          {sessions && sessions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Past Sessions</h3>
              {sessions
                .filter(s => s.week_start !== currentWeekStart)
                .sort((a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime())
                .map((session) => (
                  <Card key={session.id} className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {getWeekLabel(session.week_start)}
                        </CardTitle>
                        <Badge variant={session.is_completed ? "default" : "secondary"} className="text-xs">
                          {session.is_completed ? "Completed" : "Draft"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getWeekRange(session.week_start)}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {session.last_week_reflection && (
                        <div className="flex gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Last Week Reflection</p>
                            <p className="text-foreground/80 line-clamp-2">{session.last_week_reflection}</p>
                          </div>
                        </div>
                      )}
                      {session.week_intention && (
                        <div className="flex gap-2">
                          <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Week Intention</p>
                            <p className="text-foreground/80 line-clamp-2">{session.week_intention}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {(!sessions || sessions.filter(s => s.week_start !== currentWeekStart).length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No past planning sessions yet. Complete your first weekly planning to see your history!
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

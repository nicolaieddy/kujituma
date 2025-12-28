import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAllWeeklyPlanningSessions } from "@/hooks/useAllWeeklyPlanningSessions";
import { useWeeklyPlanning } from "@/hooks/useWeeklyPlanning";
import { useRitualsTrigger } from "@/contexts/RitualsContext";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { PlanningTrendsChart } from "./PlanningTrendsChart";
import { CalendarDays, Target, Lightbulb, Plus, CheckCircle, Clock } from "lucide-react";
import { format, parseISO, getISOWeek } from "date-fns";

export const WeeklyPlanningTab = () => {
  const { sessions, isLoading } = useAllWeeklyPlanningSessions();
  const currentWeekStart = WeeklyProgressService.getWeekStart();
  const { planningSession: currentSession } = useWeeklyPlanning(currentWeekStart);
  const { openWeeklyPlanning } = useRitualsTrigger();

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
    <div className="space-y-6">
      {/* Current Week Status */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                {getWeekLabel(currentWeekStart)}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{getWeekRange(currentWeekStart)}</p>
            </div>
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
        </CardHeader>
        <CardContent>
          {currentSession?.is_completed ? (
            <div className="space-y-4">
              {currentSession.last_week_reflection && (
                <div className="flex gap-3">
                  <Lightbulb className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Last Week Reflection</p>
                    <p className="text-sm">{currentSession.last_week_reflection}</p>
                  </div>
                </div>
              )}
              {currentSession.week_intention && (
                <div className="flex gap-3">
                  <Target className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">This Week's Intention</p>
                    <p className="text-sm">{currentSession.week_intention}</p>
                  </div>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={openWeeklyPlanning}>
                Update Plan
              </Button>
            </div>
          ) : (
            <Button onClick={openWeeklyPlanning}>
              <Plus className="h-4 w-4 mr-2" />
              {currentSession ? "Continue Planning" : "Start Planning"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Analytics Charts */}
      <PlanningTrendsChart sessions={sessions} />

      {/* Past Sessions List */}
      {sessions.filter(s => s.week_start !== currentWeekStart).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Past Planning Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessions
              .filter(s => s.week_start !== currentWeekStart)
              .slice(0, 8)
              .map((session) => (
                <div key={session.id} className="p-4 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{getWeekLabel(session.week_start)}</p>
                      <p className="text-xs text-muted-foreground">{getWeekRange(session.week_start)}</p>
                    </div>
                    <Badge variant={session.is_completed ? "default" : "secondary"} className="text-xs">
                      {session.is_completed ? "Completed" : "Draft"}
                    </Badge>
                  </div>
                  
                  {session.last_week_reflection && (
                    <div className="flex gap-2 text-sm">
                      <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                      <p className="text-muted-foreground line-clamp-2">{session.last_week_reflection}</p>
                    </div>
                  )}
                  
                  {session.week_intention && (
                    <div className="flex gap-2 text-sm">
                      <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-muted-foreground line-clamp-2">{session.week_intention}</p>
                    </div>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

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
import { Progress } from "@/components/ui/progress";
import { useAllDailyCheckIns } from "@/hooks/useAllDailyCheckIns";
import { useDailyCheckIn } from "@/hooks/useDailyCheckIn";
import { useRitualsTrigger } from "@/contexts/RitualsContext";
import { CheckInHeatmap } from "@/components/rituals/CheckInHeatmap";
import { JournalingStreaksCard } from "@/components/habits/JournalingStreaksCard";
import { MonthlyDigestCard } from "@/components/habits/MonthlyDigestCard";
import { Sun, Zap, Target, AlertCircle, TrendingUp, Plus, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

const moodEmojis = ['😔', '😕', '😐', '🙂', '😊'];

export const DailyCheckInHistory = () => {
  const { checkIns, analytics, isLoading } = useAllDailyCheckIns(90);
  const { hasCheckedInToday } = useDailyCheckIn();
  const { isDailyHistoryOpen, setDailyHistoryOpen, openDailyCheckIn } = useRitualsTrigger();

  const handleCheckIn = () => {
    setDailyHistoryOpen(false);
    openDailyCheckIn();
  };

  return (
    <Sheet open={isDailyHistoryOpen} onOpenChange={setDailyHistoryOpen}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            ☀️ Daily Check-ins
          </SheetTitle>
          <SheetDescription>
            Track your mood, energy, and daily focus
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Today's Check-in Card */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  Today
                </CardTitle>
                <Badge variant={hasCheckedInToday ? "default" : "secondary"}>
                  {hasCheckedInToday ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Checked In</>
                  ) : (
                    "Not Done"
                  )}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
            </CardHeader>
            <CardContent>
              {hasCheckedInToday ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={handleCheckIn}
                >
                  Update Check-in
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={handleCheckIn}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Check In Now
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Activity Heatmap */}
          {checkIns.length > 0 && (
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Activity Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <CheckInHeatmap checkIns={checkIns} weeks={10} />
              </CardContent>
            </Card>
          )}

          {/* Writing Stats */}
          {checkIns.length > 0 && (
            <JournalingStreaksCard checkIns={checkIns} />
          )}

          {/* Monthly Digest */}
          {checkIns.length > 0 && (
            <MonthlyDigestCard checkIns={checkIns} />
          )}

          {/* Analytics Summary */}
          {analytics && checkIns.length > 0 && (
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Last 30 Days
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Check-ins</span>
                  <span className="text-sm font-medium">{analytics.totalCheckIns}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg. Mood</span>
                    <span className="text-sm">
                      {moodEmojis[Math.round(analytics.avgMood) - 1] || '—'} ({analytics.avgMood.toFixed(1)})
                    </span>
                  </div>
                  <Progress value={(analytics.avgMood / 5) * 100} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg. Energy</span>
                    <span className="text-sm">
                      <Zap className="h-3 w-3 inline text-yellow-500" /> {analytics.avgEnergy.toFixed(1)}/5
                    </span>
                  </div>
                  <Progress value={(analytics.avgEnergy / 5) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Check-ins */}
          {checkIns && checkIns.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Recent Check-ins</h3>
              {checkIns.slice(0, 14).map((checkIn) => (
                <Card key={checkIn.id} className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {format(parseISO(checkIn.check_in_date), 'EEE, MMM d')}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {checkIn.mood_rating && (
                          <span className="text-lg">{moodEmojis[checkIn.mood_rating - 1]}</span>
                        )}
                        {checkIn.energy_level && (
                          <Badge variant="outline" className="text-xs">
                            <Zap className="h-3 w-3 mr-1 text-yellow-500" />
                            {checkIn.energy_level}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {checkIn.focus_today && (
                      <div className="flex gap-2">
                        <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-foreground/80 line-clamp-1">{checkIn.focus_today}</p>
                      </div>
                    )}
                    {checkIn.quick_win && (
                      <div className="flex gap-2">
                        <Sun className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-foreground/80 line-clamp-1">{checkIn.quick_win}</p>
                      </div>
                    )}
                    {checkIn.blocker && (
                      <div className="flex gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-foreground/80 line-clamp-1">{checkIn.blocker}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {(!checkIns || checkIns.length === 0) && (
            <EmptyState
              size="sm"
              illustration={<HabitsEmpty />}
              title="No check-ins yet"
              description="Start your first daily check-in to track your progress."
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

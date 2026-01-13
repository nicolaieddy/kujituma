import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAllDailyCheckIns } from "@/hooks/useAllDailyCheckIns";
import { useDailyCheckIn } from "@/hooks/useDailyCheckIn";
import { useRitualsTrigger } from "@/contexts/RitualsContext";

import { CheckInDetailModal } from "./CheckInDetailModal";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Sun, Zap, Target, TrendingUp, Plus, CheckCircle, BookOpen } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";

const moodEmojis = ['😔', '😕', '😐', '🙂', '😊'];

export const DailyCheckInsTab = () => {
  const { checkIns, analytics, isLoading } = useAllDailyCheckIns(90);
  const { hasCheckedInToday, todayCheckIn } = useDailyCheckIn();
  const { openDailyCheckIn } = useRitualsTrigger();
  const [selectedCheckIn, setSelectedCheckIn] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Prepare chart data for mood/energy trends
  const trendData = useMemo(() => {
    return checkIns
      .slice(0, 30)
      .reverse()
      .map((c) => ({
        date: format(parseISO(c.check_in_date), 'MMM d'),
        mood: c.mood_rating || 0,
        energy: c.energy_level || 0,
      }));
  }, [checkIns]);

  return (
    <div className="space-y-6">
      {/* Today's Status */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Today's Check-in
            </CardTitle>
            <Badge variant={hasCheckedInToday ? "default" : "secondary"}>
              {hasCheckedInToday ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Completed</>
              ) : (
                "Not Done"
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {hasCheckedInToday && todayCheckIn ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                {todayCheckIn.mood_rating && (
                  <div className="text-center">
                    <span className="text-3xl">{moodEmojis[todayCheckIn.mood_rating - 1]}</span>
                    <p className="text-xs text-muted-foreground">Mood</p>
                  </div>
                )}
                {todayCheckIn.energy_level && (
                  <div className="text-center">
                    <div className="flex items-center gap-1">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      <span className="text-xl font-bold">{todayCheckIn.energy_level}/5</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Energy</p>
                  </div>
                )}
              </div>
              {todayCheckIn.focus_today && (
                <div className="flex gap-2 text-sm">
                  <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{todayCheckIn.focus_today}</span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={openDailyCheckIn}>
                Update Check-in
              </Button>
            </div>
          ) : (
            <Button onClick={openDailyCheckIn}>
              <Plus className="h-4 w-4 mr-2" />
              Check In Now
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Activity heatmap is now shown above the tabs in Analytics */}

      {/* Analytics Summary */}
      {analytics && checkIns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Total Check-ins</span>
              </div>
              <p className="text-2xl font-bold mt-1">{analytics.totalCheckIns}</p>
              <p className="text-xs text-muted-foreground">in last 90 days</p>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Avg. Mood</span>
                <span className="text-lg">{moodEmojis[Math.round(analytics.avgMood) - 1] || '—'}</span>
              </div>
              <Progress value={(analytics.avgMood / 5) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{analytics.avgMood.toFixed(1)}/5</p>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Avg. Energy</span>
                <Zap className="h-4 w-4 text-yellow-500" />
              </div>
              <Progress value={(analytics.avgEnergy / 5) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{analytics.avgEnergy.toFixed(1)}/5</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mood & Energy Trends */}
      {trendData.length > 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Mood & Energy Trends (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    domain={[0, 5]} 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border rounded-lg p-2 shadow-lg text-sm">
                            <p className="font-medium">{label}</p>
                            <p className="text-muted-foreground">
                              Mood: {moodEmojis[(payload[0].value as number) - 1] || '—'}
                            </p>
                            <p className="text-muted-foreground">
                              Energy: {payload[1].value}/5
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="energy" 
                    stroke="hsl(45, 93%, 47%)" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-4 rounded bg-primary" />
                <span className="text-muted-foreground">Mood</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-4 rounded bg-yellow-500" />
                <span className="text-muted-foreground">Energy</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check-ins History Table */}
      {checkIns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Journal & Focus History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead className="w-[80px] text-center">Mood</TableHead>
                    <TableHead className="min-w-[250px]">Journal Entry</TableHead>
                    <TableHead className="min-w-[200px]">#1 Focus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkIns.slice(0, 14).map((checkIn) => (
                    <TableRow 
                      key={checkIn.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedCheckIn(checkIn);
                        setIsDetailOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">
                        <div>
                          <p className="text-sm">{format(parseISO(checkIn.check_in_date), 'EEE')}</p>
                          <p className="text-xs text-muted-foreground">{format(parseISO(checkIn.check_in_date), 'MMM d')}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {checkIn.mood_rating && (
                            <span className="text-lg">{moodEmojis[checkIn.mood_rating - 1]}</span>
                          )}
                          {checkIn.energy_level && (
                            <Badge variant="outline" className="text-xs">
                              <Zap className="h-3 w-3 text-yellow-500" />
                              {checkIn.energy_level}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {checkIn.journal_entry ? (
                          <p className="text-sm line-clamp-2">{checkIn.journal_entry}</p>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No entry</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {checkIn.focus_today ? (
                          <div className="flex items-start gap-1.5">
                            <Target className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground line-clamp-2">{checkIn.focus_today}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      <CheckInDetailModal
        checkIn={selectedCheckIn}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
};

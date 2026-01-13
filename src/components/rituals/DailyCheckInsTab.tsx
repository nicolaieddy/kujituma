import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useAllDailyCheckIns } from "@/hooks/useAllDailyCheckIns";
import { useDailyCheckIn } from "@/hooks/useDailyCheckIn";
import { useRitualsTrigger } from "@/contexts/RitualsContext";

import { CheckInDetailModal } from "./CheckInDetailModal";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Sun, Zap, Target, TrendingUp, Plus, CheckCircle, BookOpen, Search, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { format, parseISO, subDays, startOfMonth, startOfWeek } from "date-fns";
import { useMemo, useState } from "react";
import { DailyCheckIn } from "@/types/habits";

const moodEmojis = ['😔', '😕', '😐', '🙂', '😊'];
const ITEMS_PER_PAGE = 10;

type MoodFilter = 'all' | 'happy' | 'neutral' | 'sad';

const moodFilters: { value: MoodFilter; label: string; emoji: string; range: number[] }[] = [
  { value: 'all', label: 'All', emoji: '📋', range: [] },
  { value: 'happy', label: 'Happy', emoji: '😊', range: [4, 5] },
  { value: 'neutral', label: 'Neutral', emoji: '😐', range: [3] },
  { value: 'sad', label: 'Low', emoji: '😔', range: [1, 2] },
];

export const DailyCheckInsTab = () => {
  const { checkIns, analytics, isLoading } = useAllDailyCheckIns(365); // Fetch up to a year
  const { hasCheckedInToday, todayCheckIn } = useDailyCheckIn();
  const { openDailyCheckIn } = useRitualsTrigger();
  const [selectedCheckIn, setSelectedCheckIn] = useState<DailyCheckIn | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [moodFilter, setMoodFilter] = useState<MoodFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Filter check-ins based on search query, mood filter, and date range
  const filteredCheckIns = useMemo(() => {
    let filtered = checkIns;
    
    // Apply date range filter
    if (dateRange?.from) {
      filtered = filtered.filter((checkIn) => {
        const checkInDate = parseISO(checkIn.check_in_date);
        const fromDate = dateRange.from!;
        const toDate = dateRange.to || fromDate;
        return checkInDate >= fromDate && checkInDate <= toDate;
      });
    }
    
    // Apply mood filter
    if (moodFilter !== 'all') {
      const filterConfig = moodFilters.find(f => f.value === moodFilter);
      if (filterConfig) {
        filtered = filtered.filter((checkIn) => 
          checkIn.mood_rating && filterConfig.range.includes(checkIn.mood_rating)
        );
      }
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((checkIn) => {
        const dateStr = format(parseISO(checkIn.check_in_date), 'MMM d yyyy EEE').toLowerCase();
        const journalMatch = checkIn.journal_entry?.toLowerCase().includes(query);
        const focusMatch = checkIn.focus_today?.toLowerCase().includes(query);
        const dateMatch = dateStr.includes(query);
        return journalMatch || focusMatch || dateMatch;
      });
    }
    
    return filtered;
  }, [checkIns, searchQuery, moodFilter, dateRange]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCheckIns.length / ITEMS_PER_PAGE);
  const paginatedCheckIns = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCheckIns.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCheckIns, currentPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, moodFilter, dateRange]);

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
          <CardHeader className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Journal & Focus History
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by date or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Mood Filter Buttons */}
              {moodFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={moodFilter === filter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMoodFilter(filter.value)}
                  className="gap-1.5"
                >
                  <span>{filter.emoji}</span>
                  <span>{filter.label}</span>
                </Button>
              ))}
              
              <div className="h-6 w-px bg-border mx-1" />
              
              {/* Quick Date Presets */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({ from: subDays(new Date(), 6), to: new Date() })}
                className="text-xs"
              >
                Last 7 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({ from: subDays(new Date(), 29), to: new Date() })}
                className="text-xs"
              >
                Last 30 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({ from: startOfMonth(new Date()), to: new Date() })}
                className="text-xs"
              >
                This month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() })}
                className="text-xs"
              >
                This week
              </Button>
              
              {/* Custom Date Range Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={dateRange?.from ? "default" : "outline"}
                    size="sm"
                    className={cn("gap-1.5", !dateRange?.from && "text-muted-foreground")}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <span>
                          {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                        </span>
                      ) : (
                        format(dateRange.from, "MMM d, yyyy")
                      )
                    ) : (
                      <span>Custom</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
              
              {/* Clear Date Range Button */}
              {dateRange?.from && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange(undefined)}
                  className="h-8 px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  {paginatedCheckIns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {searchQuery || moodFilter !== 'all' || dateRange?.from ? "No entries match your filters" : "No check-ins yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCheckIns.map((checkIn) => (
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
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredCheckIns.length)} of {filteredCheckIns.length} entries
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
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

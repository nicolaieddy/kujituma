import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, getDay } from "date-fns";

interface DailyCheckIn {
  id: string;
  check_in_date: string;
  journal_entry?: string | null;
  mood_rating?: number | null;
  energy_level?: number | null;
  focus_today?: string | null;
  quick_win?: string | null;
  blocker?: string | null;
}

interface MonthlyDigestCardProps {
  checkIns: DailyCheckIn[];
}

const moodEmojis = ['😔', '😕', '😐', '🙂', '😊'];
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MonthlyDigestCard = ({ checkIns }: MonthlyDigestCardProps) => {
  // Get the most recent completed month's data
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  // Use current month if we have enough data, otherwise last month
  const monthStart = currentMonthStart;
  const monthEnd = currentMonthEnd;
  const monthLabel = format(monthStart, "MMMM yyyy");

  const monthCheckIns = checkIns.filter(c => {
    const date = parseISO(c.check_in_date);
    return isWithinInterval(date, { start: monthStart, end: monthEnd });
  });

  if (monthCheckIns.length < 3) return null;

  // Average mood
  const moodEntries = monthCheckIns.filter(c => c.mood_rating);
  const avgMood = moodEntries.length > 0
    ? moodEntries.reduce((s, c) => s + (c.mood_rating || 0), 0) / moodEntries.length
    : 0;

  // Average energy
  const energyEntries = monthCheckIns.filter(c => c.energy_level);
  const avgEnergy = energyEntries.length > 0
    ? energyEntries.reduce((s, c) => s + (c.energy_level || 0), 0) / energyEntries.length
    : 0;

  // Longest journal entry
  const longestEntry = monthCheckIns.reduce((best, c) => {
    const len = (c.journal_entry || "").trim().length;
    return len > best.length ? { length: len, date: c.check_in_date } : best;
  }, { length: 0, date: "" });

  const longestWordCount = longestEntry.length > 0
    ? (checkIns.find(c => c.check_in_date === longestEntry.date)?.journal_entry || "")
        .trim().split(/\s+/).filter(w => w.length > 0).length
    : 0;

  // Mood by day of week
  const moodByDay: { [key: number]: number[] } = {};
  monthCheckIns.forEach(c => {
    if (c.mood_rating) {
      const day = getDay(parseISO(c.check_in_date));
      if (!moodByDay[day]) moodByDay[day] = [];
      moodByDay[day].push(c.mood_rating);
    }
  });

  const dayAverages = Object.entries(moodByDay).map(([day, moods]) => ({
    day: Number(day),
    avg: moods.reduce((a, b) => a + b, 0) / moods.length,
    name: dayNames[Number(day)],
  }));

  const bestDay = dayAverages.length > 0
    ? dayAverages.reduce((a, b) => (a.avg > b.avg ? a : b))
    : null;
  const worstDay = dayAverages.length > 0
    ? dayAverages.reduce((a, b) => (a.avg < b.avg ? a : b))
    : null;

  // Total words this month
  const totalWords = monthCheckIns.reduce((sum, c) => {
    const allText = [c.journal_entry, c.focus_today, c.quick_win, c.blocker]
      .filter(Boolean).join(" ");
    return sum + allText.trim().split(/\s+/).filter(w => w.length > 0).length;
  }, 0);

  return (
    <Card className="bg-muted/30 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          {monthLabel} Digest
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Key stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-background p-2.5 text-center">
            <p className="text-lg font-semibold">{monthCheckIns.length}</p>
            <p className="text-[11px] text-muted-foreground">Check-ins</p>
          </div>
          <div className="rounded-md bg-background p-2.5 text-center">
            <p className="text-lg font-semibold">{totalWords.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Words written</p>
          </div>
          <div className="rounded-md bg-background p-2.5 text-center">
            <p className="text-lg font-semibold">
              {avgMood > 0 ? `${moodEmojis[Math.round(avgMood) - 1]} ${avgMood.toFixed(1)}` : '—'}
            </p>
            <p className="text-[11px] text-muted-foreground">Avg mood</p>
          </div>
          <div className="rounded-md bg-background p-2.5 text-center">
            <p className="text-lg font-semibold">
              {avgEnergy > 0 ? `⚡ ${avgEnergy.toFixed(1)}` : '—'}
            </p>
            <p className="text-[11px] text-muted-foreground">Avg energy</p>
          </div>
        </div>

        {/* Mood patterns */}
        {bestDay && worstDay && bestDay.day !== worstDay.day && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Mood by day</p>
            <div className="flex gap-2">
              <Badge variant="secondary" className="gap-1 text-xs">
                <TrendingUp className="h-3 w-3 text-green-500" />
                Best: {bestDay.name} ({bestDay.avg.toFixed(1)})
              </Badge>
              <Badge variant="secondary" className="gap-1 text-xs">
                <TrendingDown className="h-3 w-3 text-orange-500" />
                Lowest: {worstDay.name} ({worstDay.avg.toFixed(1)})
              </Badge>
            </div>
          </div>
        )}

        {/* Longest entry */}
        {longestEntry.date && (
          <div className="text-xs text-muted-foreground">
            📝 Longest entry: <span className="font-medium text-foreground">{longestWordCount} words</span>
            {" "}on {format(parseISO(longestEntry.date), "MMM d")}
          </div>
        )}

        {/* Day-of-week mood bar */}
        {dayAverages.length >= 3 && (
          <div className="flex items-end gap-1 h-10">
            {[0, 1, 2, 3, 4, 5, 6].map(day => {
              const entry = dayAverages.find(d => d.day === day);
              const height = entry ? (entry.avg / 5) * 100 : 0;
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-sm bg-primary/60 transition-all"
                    style={{ height: `${Math.max(height * 0.4, 2)}px` }}
                  />
                  <span className="text-[9px] text-muted-foreground">{dayNames[day][0]}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis } from "recharts";
import { PenLine, Flame, TrendingUp } from "lucide-react";
import { format, parseISO, differenceInCalendarDays, subDays } from "date-fns";

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

interface JournalingStreaksCardProps {
  checkIns: DailyCheckIn[];
}

const chartConfig = {
  words: {
    label: "Words",
    color: "hsl(var(--primary))",
  },
};

export const JournalingStreaksCard = ({ checkIns }: JournalingStreaksCardProps) => {
  // Calculate word counts per check-in (journal + all text fields)
  const wordCountData = checkIns
    .filter(c => c.journal_entry || c.focus_today || c.quick_win || c.blocker)
    .map(c => {
      const allText = [c.journal_entry, c.focus_today, c.quick_win, c.blocker]
        .filter(Boolean)
        .join(" ");
      const words = allText.trim().split(/\s+/).filter(w => w.length > 0).length;
      return {
        date: c.check_in_date,
        words,
        label: format(parseISO(c.check_in_date), "MMM d"),
      };
    })
    .reverse()
    .slice(-30); // Last 30 entries

  // Calculate journaling streak (consecutive days with journal_entry)
  const journalDates = new Set(
    checkIns
      .filter(c => c.journal_entry && c.journal_entry.trim().length > 0)
      .map(c => c.check_in_date)
  );

  let journalStreak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const dateStr = format(subDays(today, i), "yyyy-MM-dd");
    if (journalDates.has(dateStr)) {
      journalStreak++;
    } else if (i > 0) {
      break;
    }
    // Allow today to not have an entry yet (i === 0)
  }

  // Total words written
  const totalWords = checkIns.reduce((sum, c) => {
    const allText = [c.journal_entry, c.focus_today, c.quick_win, c.blocker]
      .filter(Boolean)
      .join(" ");
    return sum + (allText.trim().split(/\s+/).filter(w => w.length > 0).length);
  }, 0);

  // Average words per entry
  const entriesWithText = checkIns.filter(
    c => c.journal_entry || c.focus_today || c.quick_win || c.blocker
  ).length;
  const avgWords = entriesWithText > 0 ? Math.round(totalWords / entriesWithText) : 0;

  if (wordCountData.length === 0) return null;

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <PenLine className="h-4 w-4" />
          Writing Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats row */}
        <div className="flex gap-2 flex-wrap">
          {journalStreak > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Flame className="h-3 w-3 text-orange-500" />
              {journalStreak}d writing streak
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            {totalWords.toLocaleString()} total words
          </Badge>
          <Badge variant="outline" className="gap-1">
            ~{avgWords} words/entry
          </Badge>
        </div>

        {/* Word count chart */}
        <ChartContainer config={chartConfig} className="h-[120px] w-full aspect-auto">
          <AreaChart data={wordCountData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="wordsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="words"
              stroke="hsl(var(--primary))"
              fill="url(#wordsFill)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

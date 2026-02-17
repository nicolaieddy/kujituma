import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { Smile } from 'lucide-react';

interface CheckInPoint {
  date: string;
  label: string;
  mood?: number;
  energy?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg p-3 shadow-md text-sm space-y-1">
        <p className="font-medium text-foreground">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {p.value}/10
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const MoodEnergyTrendsChart = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['mood-energy-trends', user?.id],
    queryFn: async (): Promise<CheckInPoint[]> => {
      if (!user) return [];
      const since = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('check_in_date, mood_rating, energy_level')
        .eq('user_id', user.id)
        .gte('check_in_date', since)
        .order('check_in_date', { ascending: true });

      if (error) throw error;
      return (data || []).map((row) => ({
        date: row.check_in_date,
        label: format(parseISO(row.check_in_date), 'MMM d'),
        mood: row.mood_rating ?? undefined,
        energy: row.energy_level ?? undefined,
      }));
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const chartData = data ?? [];
  const hasData = chartData.some((d) => d.mood !== undefined || d.energy !== undefined);

  // Compute averages
  const moodPoints = chartData.filter((d) => d.mood !== undefined);
  const energyPoints = chartData.filter((d) => d.energy !== undefined);
  const avgMood =
    moodPoints.length > 0
      ? (moodPoints.reduce((s, d) => s + (d.mood ?? 0), 0) / moodPoints.length).toFixed(1)
      : null;
  const avgEnergy =
    energyPoints.length > 0
      ? (energyPoints.reduce((s, d) => s + (d.energy ?? 0), 0) / energyPoints.length).toFixed(1)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Smile className="h-4 w-4" />
          Mood & Energy Trends
          <span className="text-xs font-normal text-muted-foreground ml-1">(last 30 days)</span>
        </CardTitle>
        {hasData && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            {avgMood && <span>Avg mood: <strong className="text-foreground">{avgMood}/10</strong></span>}
            {avgEnergy && <span>Avg energy: <strong className="text-foreground">{avgEnergy}/10</strong></span>}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : !hasData ? (
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
            No check-in data yet. Start a daily check-in to see trends!
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[1, 10]}
                ticks={[2, 4, 6, 8, 10]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="mood"
                name="Mood"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="energy"
                name="Energy"
                stroke="hsl(142 76% 36%)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(142 76% 36%)' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

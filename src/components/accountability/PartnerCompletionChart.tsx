import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface WeekStat {
  week_start: string;
  total: number;
  completed: number;
}

interface PartnerCompletionChartProps {
  partnerId: string;
}

export function PartnerCompletionChart({ partnerId }: PartnerCompletionChartProps) {
  const { data: weeks, isLoading } = useQuery({
    queryKey: ['partner-completion-stats', partnerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_partner_weekly_completion_stats', {
        p_partner_id: partnerId,
        p_weeks: 12,
      });
      if (error) throw error;
      return (data as unknown as WeekStat[]) || [];
    },
    enabled: !!partnerId,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!weeks || weeks.length === 0) return null;

  const chartData = weeks.map((w) => {
    const rate = w.total > 0 ? Math.round((w.completed / w.total) * 100) : 0;
    const label = format(parseISO(w.week_start), 'MMM d');
    return {
      label,
      weekStart: w.week_start,
      total: w.total,
      completed: w.completed,
      rate,
    };
  });

  const hasAnyData = chartData.some((d) => d.total > 0);
  if (!hasAnyData) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Weekly Completion Rate
        </CardTitle>
        <p className="text-xs text-muted-foreground">Rolling 12 weeks</p>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval={1}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                width={40}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(_: any, __: any, props: any) => {
                  const d = props.payload;
                  return [`${d.completed}/${d.total} objectives (${d.rate}%)`, 'Completed'];
                }}
                labelFormatter={(label) => `Week of ${label}`}
              />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.total === 0
                        ? 'hsl(var(--muted))'
                        : entry.rate >= 75
                        ? 'hsl(var(--primary))'
                        : entry.rate >= 50
                        ? 'hsl(var(--primary) / 0.7)'
                        : 'hsl(var(--primary) / 0.4)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

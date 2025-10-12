import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WeeklyObjective } from '@/types/weeklyProgress';
import { Skeleton } from '@/components/ui/skeleton';

interface PartnerProgressViewProps {
  partnerId: string;
  weekStart: string;
}

export const PartnerProgressView = ({ partnerId, weekStart }: PartnerProgressViewProps) => {
  const [objectives, setObjectives] = useState<WeeklyObjective[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPartnerProgress = async () => {
      try {
        const { data, error } = await supabase
          .from('weekly_objectives')
          .select('*')
          .eq('user_id', partnerId)
          .eq('week_start', weekStart)
          .order('order_index', { ascending: true });

        if (error) throw error;
        setObjectives(data || []);
      } catch (error) {
        console.error('Error fetching partner progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPartnerProgress();
  }, [partnerId, weekStart]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const completedCount = objectives.filter(obj => obj.is_completed).length;
  const completionPercentage = objectives.length > 0
    ? Math.round((completedCount / objectives.length) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Partner's Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {objectives.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No objectives for this week yet
            </p>
          ) : (
            <>
              {objectives.map((obj) => (
                <div
                  key={obj.id}
                  className={`p-3 rounded-lg border ${
                    obj.is_completed
                      ? 'bg-success/10 border-success/20'
                      : 'bg-background border-border'
                  }`}
                >
                  <p className={`text-sm ${obj.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                    {obj.text}
                  </p>
                </div>
              ))}
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  Completion: <span className="font-semibold text-foreground">{completionPercentage}%</span> ({completedCount}/{objectives.length})
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

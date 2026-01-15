import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { Compass, TrendingUp, AlertCircle } from 'lucide-react';
import { useCategoryFocus, CategoryFocusData } from '@/hooks/useCategoryFocus';

export const CategoryRadarChart = () => {
  const { data: categoryData, isLoading } = useCategoryFocus();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!categoryData || categoryData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="h-4 w-4" />
            Life Balance Radar
          </CardTitle>
          <CardDescription>
            See which areas of your life are getting the most attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Start adding goals to see your life balance radar
          </div>
        </CardContent>
      </Card>
    );
  }

  // Identify top and neglected areas
  const sortedByFocus = [...categoryData].sort((a, b) => b.focusScore - a.focusScore);
  const activeCategories = sortedByFocus.filter(c => c.totalObjectives > 0 || c.activeGoals > 0);
  const topAreas = activeCategories.slice(0, 2).filter(c => c.focusScore > 20);
  const neglectedAreas = sortedByFocus
    .filter(c => c.focusScore < 10 && c.activeGoals === 0)
    .slice(0, 2);

  // Prepare data for radar chart - ensure we show all categories
  const radarData = categoryData.map(cat => ({
    category: cat.shortName,
    fullCategory: cat.category,
    focusScore: cat.focusScore,
    activeGoals: cat.activeGoals,
    completedObjectives: cat.completedObjectives,
    totalObjectives: cat.totalObjectives,
    completionRate: cat.completionRate,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Compass className="h-4 w-4" />
          Life Balance Radar
        </CardTitle>
        <CardDescription>
          See which areas of your life are getting the most attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Radar Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid 
                stroke="hsl(var(--border))" 
                strokeDasharray="3 3"
              />
              <PolarAngleAxis 
                dataKey="category" 
                tick={{ 
                  fontSize: 11, 
                  fill: 'hsl(var(--muted-foreground))',
                }}
                tickLine={false}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickCount={5}
                axisLine={false}
              />
              <Radar
                name="Focus"
                dataKey="focusScore"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload?.[0]) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg p-3 shadow-md min-w-[160px]">
                        <p className="text-sm font-medium mb-2">{data.fullCategory}</p>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>Focus Score: <span className="font-medium text-foreground">{data.focusScore}%</span></p>
                          <p>Active Goals: <span className="font-medium text-foreground">{data.activeGoals}</span></p>
                          <p>Objectives: <span className="font-medium text-foreground">{data.completedObjectives}/{data.totalObjectives}</span></p>
                          {data.totalObjectives > 0 && (
                            <p>Completion: <span className="font-medium text-foreground">{data.completionRate.toFixed(0)}%</span></p>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Insights */}
        <div className="space-y-3 pt-2 border-t">
          {topAreas.length > 0 && (
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Top Focus Areas</p>
                <div className="flex flex-wrap gap-1.5">
                  {topAreas.map(area => (
                    <Badge 
                      key={area.category} 
                      variant="secondary"
                      className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                    >
                      {area.shortName} ({area.focusScore}%)
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {neglectedAreas.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Areas Needing Attention</p>
                <div className="flex flex-wrap gap-1.5">
                  {neglectedAreas.map(area => (
                    <Badge 
                      key={area.category} 
                      variant="secondary"
                      className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                    >
                      {area.shortName}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {topAreas.length === 0 && neglectedAreas.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Add more goals and objectives to see insights about your life balance
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

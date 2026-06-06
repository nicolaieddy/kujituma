import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { useValues } from "@/hooks/useValues";
import { useAllAlignments, useAllValueLinks } from "@/hooks/useGoalValueAlignment";
import { useGoals } from "@/hooks/useGoals";
import { Button } from "@/components/ui/button";

export const ValuesAlignmentCard = () => {
  const { values } = useValues();
  const { data: alignments = [] } = useAllAlignments();
  const { data: links = [] } = useAllValueLinks();
  const { activeGoals } = useGoals();

  const activeIds = useMemo(() => new Set(activeGoals.map((g) => g.id)), [activeGoals]);

  const radarData = useMemo(() => {
    return values.map((v) => {
      const total = links
        .filter((l) => l.value_id === v.id && activeIds.has(l.goal_id))
        .reduce((acc, l) => acc + l.weight, 0);
      return { value: v.label, score: total };
    });
  }, [values, links, activeIds]);

  const avgScore = useMemo(() => {
    const active = alignments.filter((a) => activeIds.has(a.goal_id));
    if (active.length === 0) return 0;
    return Math.round(active.reduce((acc, a) => acc + a.score, 0) / active.length);
  }, [alignments, activeIds]);

  const lowAlignment = useMemo(() => {
    return activeGoals
      .map((g) => ({ goal: g, score: alignments.find((a) => a.goal_id === g.id)?.score ?? 0 }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
  }, [activeGoals, alignments]);

  if (values.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-primary" />
            Values alignment
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Define your values to see how your active goals align with what you care about.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/profile?tab=values">Add my values</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-primary" />
            Values alignment
          </CardTitle>
          <div className="text-right">
            <p className="text-2xl font-bold leading-tight">{avgScore}%</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">avg active goal</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[220px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius={80}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="value" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar
                name="Weight invested"
                dataKey="score"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {lowAlignment.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Lowest alignment — consider re-tagging or rethinking
            </p>
            <ul className="space-y-1">
              {lowAlignment.map(({ goal, score }) => (
                <li key={goal.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{goal.title}</span>
                  <span className={`text-xs font-medium ${score < 30 ? "text-muted-foreground" : "text-foreground"}`}>
                    {score}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import { useSocialGoals } from "@/hooks/useSocialGoals";
import { useFollowerGrowth } from "@/hooks/useFollowerGrowth";
import { useSocialPosts } from "@/hooks/useSocialPosts";
import { computeGoalProgress, todayISO, type ProgressStatus, type SocialGoal } from "@/lib/socialGoals";

/**
 * Compact one-line summary of active social goals.
 * Hidden when there are no active goals so the header stays clean.
 */
export function GoalProgressStrip({ onJumpToSetup }: { onJumpToSetup?: () => void }) {
  const { data: goals = [] } = useSocialGoals();
  const { data: growth = [] } = useFollowerGrowth();
  const { data: posts = [] } = useSocialPosts();

  const summary = useMemo(() => {
    const active = goals.filter((g) => g.status === "active");
    if (active.length === 0) return null;
    const counts: Record<ProgressStatus, number> = { on_track: 0, ahead: 0, behind: 0, achieved: 0, not_started: 0 };
    for (const g of active) {
      const actual = actualFor(g, growth, posts);
      const p = computeGoalProgress(g, actual);
      counts[p.status]++;
    }
    return { total: active.length, counts };
  }, [goals, growth, posts]);

  if (!summary) return null;

  const onTrackish = summary.counts.on_track + summary.counts.ahead + summary.counts.achieved;
  const behind = summary.counts.behind;

  return (
    <Card
      className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onJumpToSetup}
      role={onJumpToSetup ? "button" : undefined}
    >
      <div className="flex items-center gap-2 text-sm">
        <Target className="h-4 w-4 text-primary" />
        <span className="font-medium tabular-nums">{onTrackish} of {summary.total}</span>
        <span className="text-muted-foreground">goals on track</span>
        {behind > 0 && <span className="text-muted-foreground">· <span className="text-amber-700 dark:text-amber-300 font-medium">{behind} behind</span></span>}
      </div>
      <div className="flex items-center gap-1.5">
        {summary.counts.achieved > 0 && <Badge variant="outline" className="gap-1 text-[10px] bg-primary/10 text-primary border-primary/30"><CheckCircle2 className="h-3 w-3" />{summary.counts.achieved} achieved</Badge>}
        {summary.counts.ahead > 0 && <Badge variant="outline" className="gap-1 text-[10px] bg-emerald-100 text-emerald-900 border-emerald-500/30 dark:bg-emerald-950 dark:text-emerald-100"><TrendingUp className="h-3 w-3" />{summary.counts.ahead} ahead</Badge>}
        {behind > 0 && <Badge variant="outline" className="gap-1 text-[10px] bg-amber-100 text-amber-900 border-amber-500/30 dark:bg-amber-950 dark:text-amber-100"><TrendingDown className="h-3 w-3" />{behind} behind</Badge>}
      </div>
    </Card>
  );
}

export function actualFor(
  goal: SocialGoal,
  growth: Array<{ platform: string; date: string; total_followers: number }>,
  posts: Array<{ status: string; publish_date: string | null; platforms: string[] }>,
): number {
  if (goal.metric === "followers") {
    const series = growth.filter((g) => g.platform === goal.platform).sort((a, b) => a.date.localeCompare(b.date));
    return series[series.length - 1]?.total_followers ?? goal.start_value;
  }
  const today = todayISO();
  return posts.filter((p) =>
    p.status === "published" &&
    p.publish_date &&
    p.publish_date >= goal.start_date &&
    p.publish_date <= today &&
    (p.platforms ?? []).includes(goal.platform),
  ).length;
}

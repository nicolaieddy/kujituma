import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Target, TrendingUp, FileText, Pencil } from "lucide-react";
import { format } from "date-fns";
import { PLATFORM_META } from "@/lib/social";
import { useSocialGoals } from "@/hooks/useSocialGoals";
import { useFollowerGrowth } from "@/hooks/useFollowerGrowth";
import { useSocialPosts } from "@/hooks/useSocialPosts";
import { computeGoalProgress, METRIC_META, PROGRESS_TONE } from "@/lib/socialGoals";
import { actualFor } from "./GoalProgressStrip";
import { CompactNumber } from "./CompactNumber";
import { useShowGoalLine } from "@/hooks/useShowGoalLine";
import { cn } from "@/lib/utils";

export function AnalyticsGoalsSection({ onEditInSetup }: { onEditInSetup?: () => void }) {
  const { data: goals = [] } = useSocialGoals();
  const { data: growth = [] } = useFollowerGrowth();
  const { data: posts = [] } = useSocialPosts();
  const [showLine, setShowLine] = useShowGoalLine();

  const active = useMemo(() => goals.filter((g) => g.status === "active"), [goals]);
  if (active.length === 0) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Goals</h3>
          <Badge variant="secondary" className="text-[10px]">{active.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="show-goal-line" className="text-xs text-muted-foreground">Show goal line on charts</Label>
          <Switch id="show-goal-line" checked={showLine} onCheckedChange={setShowLine} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {active.map((g) => {
          const actual = actualFor(g, growth as any, posts as any);
          const p = computeGoalProgress(g, actual);
          const tone = PROGRESS_TONE[p.status];
          const PlatIcon = PLATFORM_META[g.platform].icon;
          const MetricIcon = g.metric === "followers" ? TrendingUp : FileText;
          return (
            <div key={g.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <PlatIcon className={cn("h-4 w-4 shrink-0", PLATFORM_META[g.platform].color)} />
                  <MetricIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{PLATFORM_META[g.platform].label} · {METRIC_META[g.metric].label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      <CompactNumber value={g.start_value} /> → <CompactNumber value={g.target_value} /> by {format(new Date(g.target_date), "d MMM yy")}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${tone.className}`}>{tone.label}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-semibold tabular-nums"><CompactNumber value={actual} /></div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Now</div>
                </div>
                <div>
                  <div className="text-lg font-semibold tabular-nums text-muted-foreground"><CompactNumber value={Math.round(p.expectedToday)} /></div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Expected</div>
                </div>
                <div>
                  <div className={cn("text-lg font-semibold tabular-nums", p.delta >= 0 ? "text-emerald-600" : "text-amber-600")}>
                    {p.delta >= 0 ? "+" : ""}{Math.round(p.delta).toLocaleString()}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Δ vs plan</div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="absolute top-0 bottom-0 w-px bg-foreground/40" style={{ left: `${Math.max(0, Math.min(100, (p.daysElapsed / p.daysTotal) * 100))}%` }} />
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, p.pctToTarget * 100))}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                  <span>{p.daysRemaining}d left</span>
                  <span>need {p.perDayNeeded > 0 ? p.perDayNeeded.toFixed(1) : "0"}/day · pace {p.perDayPace.toFixed(1)}/day</span>
                </div>
              </div>

              {onEditInSetup && (
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline inline-flex items-center gap-1"
                  onClick={onEditInSetup}
                >
                  <Pencil className="h-3 w-3" /> Edit in Setup
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

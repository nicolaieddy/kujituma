import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Target, FileText, TrendingUp, TrendingDown, History, Trash2, Link2, Archive } from "lucide-react";
import { format } from "date-fns";
import type { SocialPlatform } from "@/lib/social";
import { useSocialGoals, useDeleteSocialGoal, useArchiveSocialGoal } from "@/hooks/useSocialGoals";
import { useFollowerGrowth } from "@/hooks/useFollowerGrowth";
import { useSocialPosts } from "@/hooks/useSocialPosts";
import {
  computeGoalProgress, METRIC_META, PROGRESS_TONE, todayISO,
  type GoalMetric, type SocialGoal,
} from "@/lib/socialGoals";
import { GoalDialog } from "./GoalDialog";
import { CompactNumber } from "./CompactNumber";

export function GoalsCard({ platform }: { platform: SocialPlatform }) {
  const { data: goals = [] } = useSocialGoals();
  const { data: growth = [] } = useFollowerGrowth();
  const { data: posts = [] } = useSocialPosts();
  const del = useDeleteSocialGoal();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [defaultMetric, setDefaultMetric] = useState<GoalMetric>("followers");
  const [showHistory, setShowHistory] = useState(false);

  const platformGoals = goals.filter((g) => g.platform === platform);
  const activeGoals = platformGoals.filter((g) => g.status === "active");
  const archivedGoals = platformGoals.filter((g) => g.status !== "active");

  const editing = editingId ? platformGoals.find((g) => g.id === editingId) ?? null : null;

  const openNew = (metric: GoalMetric) => {
    setDefaultMetric(metric);
    setEditingId(null);
    setOpen(true);
  };
  const openEdit = (id: string) => {
    setEditingId(id);
    setOpen(true);
  };

  const actualFor = useMemo(() => {
    return (goal: SocialGoal): number => {
      if (goal.metric === "followers") {
        const latest = growth
          .filter((g) => g.platform === platform)
          .sort((a, b) => a.date.localeCompare(b.date))
          .pop();
        return latest?.total_followers ?? goal.start_value;
      }
      const today = todayISO();
      return posts.filter((p) =>
        p.status === "published" &&
        p.publish_date &&
        p.publish_date >= goal.start_date &&
        p.publish_date <= today &&
        (p.platforms ?? []).includes(platform),
      ).length;
    };
  }, [growth, posts, platform]);

  // Render a slot for each metric so missing ones are obvious "Add" CTAs.
  const slots: GoalMetric[] = ["followers", "posts_published"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Target className="h-4 w-4 text-muted-foreground" /> Goals
        </div>
        {archivedGoals.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowHistory((v) => !v)}>
            <History className="h-3 w-3" />
            {showHistory ? "Hide" : "Show"} previous ({archivedGoals.length})
          </Button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {slots.map((metric) => {
          const goal = activeGoals.find((g) => g.metric === metric);
          if (!goal) {
            return (
              <button
                key={metric}
                type="button"
                onClick={() => openNew(metric)}
                className="group flex items-center justify-between gap-2 rounded-md border border-dashed bg-muted/20 p-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-2">
                  {metric === "followers" ? <TrendingUp className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <div className="text-sm font-medium">{METRIC_META[metric].label}</div>
                    <div className="text-[11px] text-muted-foreground">No active goal</div>
                  </div>
                </div>
                <span className="text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">+ Add</span>
              </button>
            );
          }

          const actual = actualFor(goal);
          const p = computeGoalProgress(goal, actual);
          const tone = PROGRESS_TONE[p.status];
          const Icon = metric === "followers" ? TrendingUp : FileText;
          const deltaSign = p.delta >= 0 ? "+" : "";

          return (
            <Card key={metric} className="p-3 space-y-2 border-l-2" style={{ borderLeftColor: tone.className.includes("emerald") ? "rgb(16 185 129)" : tone.className.includes("amber") ? "rgb(245 158 11)" : "hsl(var(--primary))" }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{METRIC_META[metric].label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {goal.start_value.toLocaleString()} → {goal.target_value.toLocaleString()} by {format(new Date(goal.target_date), "d MMM yyyy")}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] font-medium ${tone.className}`}>{tone.label}</Badge>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                  {/* Expected marker */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-foreground/40"
                    style={{ left: `${clampPct(p.daysElapsed / p.daysTotal)}%` }}
                    title="Expected today"
                  />
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${clampPct(p.pctToTarget)}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-2 text-[11px] text-muted-foreground tabular-nums">
                  <span>
                    Now <strong className="text-foreground"><CompactNumber value={actual} /></strong>
                    {" · "}expected <CompactNumber value={Math.round(p.expectedToday)} />
                    {" · "}<span className={p.delta >= 0 ? "text-emerald-600" : "text-amber-600"}>
                      {deltaSign}{Math.round(p.delta).toLocaleString()}
                    </span>
                  </span>
                  <span>
                    {p.daysRemaining}d left · need {p.perDayNeeded > 0 ? p.perDayNeeded.toFixed(1) : "0"}/day
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 pt-1">
                {goal.linked_goal_id && (
                  <Badge variant="secondary" className="gap-1 text-[10px] font-normal">
                    <Link2 className="h-2.5 w-2.5" /> Linked to Goals
                  </Badge>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => openEdit(goal.id)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <DeleteButton onConfirm={() => del.mutate(goal.id)} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* History */}
      {showHistory && archivedGoals.length > 0 && (
        <Card className="p-3 space-y-2 bg-muted/20">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Previous goals</div>
          <ul className="space-y-1">
            {archivedGoals.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">
                  {METRIC_META[g.metric].label} · {g.start_value.toLocaleString()} → {g.target_value.toLocaleString()} by {format(new Date(g.target_date), "d MMM yy")}
                </span>
                <Badge variant="outline" className="text-[10px]">{g.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <GoalDialog
        open={open}
        onClose={() => { setOpen(false); setEditingId(null); }}
        platform={platform}
        editing={editing}
        defaultMetric={defaultMetric}
      />
    </div>
  );
}

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v * 100));
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3 w-3" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
          <AlertDialogDescription>
            Your tracked metric history stays — only the goal target and projection line are removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import type { SocialPlatform } from "./social";

export type GoalMetric = "followers" | "posts_published";
export type GoalStatus = "active" | "archived" | "achieved";

export interface SocialGoal {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  metric: GoalMetric;
  start_date: string;
  start_value: number;
  target_value: number;
  target_date: string;
  status: GoalStatus;
  linked_goal_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ProgressStatus = "on_track" | "ahead" | "behind" | "achieved" | "not_started";

export interface GoalProgress {
  expectedToday: number;
  actualToday: number;
  pctToTarget: number;        // 0..1+
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  delta: number;              // actual - expected
  status: ProgressStatus;
  perDayNeeded: number;       // to hit target from today
  perDayPace: number;         // observed avg since start
}

const MS_PER_DAY = 86_400_000;

function daysBetween(aISO: string, bISO: string): number {
  return Math.round((new Date(bISO).getTime() - new Date(aISO).getTime()) / MS_PER_DAY);
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computeGoalProgress(goal: SocialGoal, actualToday: number): GoalProgress {
  const today = todayISO();
  const daysTotal = Math.max(1, daysBetween(goal.start_date, goal.target_date));
  const daysElapsedRaw = daysBetween(goal.start_date, today);
  const daysElapsed = Math.max(0, Math.min(daysTotal, daysElapsedRaw));
  const daysRemaining = Math.max(0, daysTotal - daysElapsed);

  const span = goal.target_value - goal.start_value;
  const expectedToday = goal.start_value + (span * daysElapsed) / daysTotal;
  const delta = actualToday - expectedToday;

  const pctToTarget = span === 0 ? 1 : (actualToday - goal.start_value) / span;
  const perDayNeeded = daysRemaining > 0 ? (goal.target_value - actualToday) / daysRemaining : 0;
  const perDayPace = daysElapsed > 0 ? (actualToday - goal.start_value) / daysElapsed : 0;

  let status: ProgressStatus;
  if (span > 0 && actualToday >= goal.target_value) status = "achieved";
  else if (daysElapsedRaw < 0) status = "not_started";
  else {
    // Tolerance: 5% of the *remaining-needed* gap to expected.
    const tolerance = Math.max(1, Math.abs(span) * 0.05);
    if (delta >= tolerance) status = "ahead";
    else if (delta >= -tolerance) status = "on_track";
    else status = "behind";
  }

  return { expectedToday, actualToday, pctToTarget, daysElapsed, daysTotal, daysRemaining, delta, status, perDayNeeded, perDayPace };
}

export const PROGRESS_TONE: Record<ProgressStatus, { label: string; className: string }> = {
  on_track:    { label: "On track",    className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100 border-emerald-500/30" },
  ahead:       { label: "Ahead",       className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100 border-emerald-500/30" },
  behind:      { label: "Behind",      className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100 border-amber-500/30" },
  achieved:    { label: "Achieved",    className: "bg-primary/15 text-primary border-primary/30" },
  not_started: { label: "Not started", className: "bg-muted text-muted-foreground border-border" },
};

export const METRIC_META: Record<GoalMetric, { label: string; unit: string; short: string }> = {
  followers:       { label: "Followers",       unit: "followers", short: "followers" },
  posts_published: { label: "Posts published", unit: "posts",     short: "posts" },
};

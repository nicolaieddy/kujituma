import { Linkedin, Twitter, Instagram, Music2, type LucideIcon } from "lucide-react";

export type SocialPlatform = "linkedin" | "x" | "instagram" | "tiktok";
export type SocialStatus = "idea" | "drafting" | "in_review" | "ready" | "scheduled" | "published";
export type SocialTrustCheck = "passes" | "needs_work" | "not_checked";

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["linkedin", "x", "instagram", "tiktok"];

export const PLATFORM_META: Record<SocialPlatform, { label: string; icon: LucideIcon; color: string; hex: string }> = {
  linkedin:  { label: "LinkedIn",  icon: Linkedin,  color: "text-[#0A66C2]", hex: "#0A66C2" },
  x:         { label: "X",         icon: Twitter,   color: "text-foreground", hex: "#000000" },
  instagram: { label: "Instagram", icon: Instagram, color: "text-[#E4405F]", hex: "#E4405F" },
  tiktok:    { label: "TikTok",    icon: Music2,    color: "text-foreground", hex: "#010101" },
};

export const STATUS_META: Record<SocialStatus, { label: string; order: number; tone: string }> = {
  idea:       { label: "Idea",       order: 0, tone: "bg-muted text-muted-foreground" },
  drafting:   { label: "Drafting",   order: 1, tone: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100" },
  in_review:  { label: "In review",  order: 2, tone: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100" },
  ready:      { label: "Ready",      order: 3, tone: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" },
  scheduled:  { label: "Scheduled",  order: 4, tone: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100" },
  published:  { label: "Published",  order: 5, tone: "bg-primary/15 text-primary" },
};

export const STATUS_ORDER: SocialStatus[] = ["idea", "drafting", "in_review", "ready", "scheduled", "published"];

/** Statuses shown as kanban columns. Legacy 'in_review' and 'ready' are folded into 'drafting' on display. */
export type BoardStatus = "idea" | "drafting" | "scheduled" | "published";
export const BOARD_ORDER: BoardStatus[] = ["idea", "drafting", "scheduled", "published"];
export function toBoardStatus(s: SocialStatus): BoardStatus {
  if (s === "in_review" || s === "ready") return "drafting";
  return s as BoardStatus;
}

export const TRUST_CHECK_META: Record<SocialTrustCheck, { label: string; tone: string }> = {
  passes:      { label: "Passes",      tone: "bg-emerald-100 text-emerald-900" },
  needs_work:  { label: "Needs work",  tone: "bg-amber-100 text-amber-900" },
  not_checked: { label: "Not checked", tone: "bg-muted text-muted-foreground" },
};

export function formatEngagementRate(rate: number | null | undefined): string {
  if (rate == null || !isFinite(Number(rate))) return "—";
  return `${(Number(rate) * 100).toFixed(2)}%`;
}

export function formatCompact(n: number | null | undefined): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  // Full figure (with thousands separator) up to 1,000 — every digit visible.
  if (abs < 1_000) return n.toLocaleString();
  // 1K–1M: 2-decimal K for finer granularity (e.g. 6.23K instead of 6.2K).
  if (abs < 1_000_000) {
    const v = n / 1_000;
    // Drop trailing zeros so 6.00K → 6K, 6.20K → 6.2K, 6.23K stays.
    return `${parseFloat(v.toFixed(2))}K`;
  }
  // 1M+: 2-decimal M.
  const v = n / 1_000_000;
  return `${parseFloat(v.toFixed(2))}M`;
}


export interface PaceComputation {
  current: number | null;
  target: number | null;
  deadline: string | null;
  netNew30d: number;
  perDayNeeded: number | null;
  perDayActual: number;
  daysToDeadline: number | null;
  status: "on_track" | "behind" | "ahead" | "no_target" | "complete";
}

export function computePace(opts: {
  current: number | null;
  target: number | null;
  deadline: string | null;
  netNew30d: number;
}): PaceComputation {
  const { current, target, deadline, netNew30d } = opts;
  const perDayActual = netNew30d / 30;
  if (target == null || deadline == null || current == null) {
    return {
      current, target, deadline, netNew30d, perDayActual,
      perDayNeeded: null, daysToDeadline: null, status: "no_target",
    };
  }
  if (current >= target) {
    return { current, target, deadline, netNew30d, perDayActual, perDayNeeded: 0, daysToDeadline: 0, status: "complete" };
  }
  const days = Math.max(1, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000));
  const perDayNeeded = (target - current) / days;
  let status: PaceComputation["status"] = "behind";
  if (perDayActual >= perDayNeeded * 1.1) status = "ahead";
  else if (perDayActual >= perDayNeeded * 0.9) status = "on_track";
  return { current, target, deadline, netNew30d, perDayActual, perDayNeeded, daysToDeadline: days, status };
}

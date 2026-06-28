import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp } from "lucide-react";
import { PLATFORM_META, type SocialPlatform } from "@/lib/social";
import { METRIC_META, todayISO, type GoalMetric, type SocialGoal } from "@/lib/socialGoals";
import { useUpsertSocialGoal } from "@/hooks/useSocialGoals";
import { useFollowerGrowth } from "@/hooks/useFollowerGrowth";
import { useSocialPosts } from "@/hooks/useSocialPosts";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onClose: () => void;
  platform: SocialPlatform;
  editing?: SocialGoal | null;
  defaultMetric?: GoalMetric;
}

export function GoalDialog({ open, onClose, platform, editing, defaultMetric = "followers" }: Props) {
  const upsert = useUpsertSocialGoal();
  const { data: growth = [] } = useFollowerGrowth();
  const { data: posts = [] } = useSocialPosts();

  const [metric, setMetric] = useState<GoalMetric>(defaultMetric);
  const [startDate, setStartDate] = useState<string>(todayISO());
  const [startValue, setStartValue] = useState<string>("");
  const [confirmedStart, setConfirmedStart] = useState<boolean>(false);
  const [targetValue, setTargetValue] = useState<string>("");
  const [targetDate, setTargetDate] = useState<string>("");
  const [mirror, setMirror] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  // Reset form on open / edit-context change.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setMetric(editing.metric);
      setStartDate(editing.start_date);
      setStartValue(String(editing.start_value));
      setConfirmedStart(true);
      setTargetValue(String(editing.target_value));
      setTargetDate(editing.target_date);
      setNotes(editing.notes ?? "");
      setMirror(false);
    } else {
      setMetric(defaultMetric);
      setStartDate(todayISO());
      setStartValue("");
      setConfirmedStart(false);
      setTargetValue("");
      setTargetDate("");
      setNotes("");
      setMirror(false);
    }
  }, [open, editing, defaultMetric]);

  /** Computed snapshot at start_date for the chosen metric. */
  const snapshot = useMemo<{ value: number | null; source: string }>(() => {
    if (metric === "followers") {
      const platformGrowth = growth.filter((g) => g.platform === platform);
      if (platformGrowth.length === 0) return { value: null, source: "no follower history yet" };
      // Find the latest entry ≤ start_date; fall back to earliest if start_date precedes data.
      const onOrBefore = platformGrowth.filter((g) => g.date <= startDate).sort((a, b) => a.date.localeCompare(b.date));
      if (onOrBefore.length > 0) {
        const last = onOrBefore[onOrBefore.length - 1];
        return { value: last.total_followers, source: `recorded ${format(new Date(last.date), "d MMM yyyy")}` };
      }
      const earliest = [...platformGrowth].sort((a, b) => a.date.localeCompare(b.date))[0];
      return { value: earliest.total_followers, source: `no data before ${format(new Date(startDate), "d MMM yyyy")} — showing earliest record (${format(new Date(earliest.date), "d MMM yyyy")})` };
    }
    // posts_published — count of posts on this platform published on or before start_date.
    const count = posts.filter((p) =>
      p.status === "published" &&
      p.publish_date &&
      p.publish_date <= startDate &&
      (p.platforms ?? []).includes(platform),
    ).length;
    return { value: count, source: `counted from your published posts up to ${format(new Date(startDate), "d MMM yyyy")}` };
  }, [metric, startDate, growth, posts, platform]);

  // When user changes start_date or metric and hasn't manually overridden, re-suggest snapshot.
  useEffect(() => {
    if (editing) return;
    if (snapshot.value == null) return;
    setStartValue(String(snapshot.value));
    setConfirmedStart(false);
  }, [snapshot.value, editing]);

  const startNum = Number(startValue);
  const targetNum = Number(targetValue);
  const validNumbers = Number.isFinite(startNum) && Number.isFinite(targetNum) && targetNum > startNum;
  const validDates = !!startDate && !!targetDate && targetDate > startDate;
  const canSave = confirmedStart && validNumbers && validDates && !upsert.isPending;

  const PlatformIcon = PLATFORM_META[platform].icon;

  const submit = () => {
    if (!canSave) return;
    upsert.mutate(
      {
        id: editing?.id,
        platform,
        metric,
        start_date: startDate,
        start_value: startNum,
        target_value: targetNum,
        target_date: targetDate,
        notes: notes.trim() || null,
        mirrorToGoals: !editing && mirror,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlatformIcon className={`h-5 w-5 ${PLATFORM_META[platform].color}`} />
            {editing ? "Edit goal" : "New goal"} · {PLATFORM_META[platform].label}
          </DialogTitle>
          <DialogDescription>
            Set a target and we'll project the expected pace so you can see if you're on track.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Metric */}
          <div className="space-y-1.5">
            <Label className="text-xs">What are you tracking?</Label>
            <div className="flex gap-2">
              {(["followers", "posts_published"] as GoalMetric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={!!editing}
                  onClick={() => setMetric(m)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    metric === m ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                  } ${editing ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {METRIC_META[m].label}
                </button>
              ))}
            </div>
            {editing && <p className="text-[11px] text-muted-foreground">Metric can't change on an existing goal.</p>}
          </div>

          {/* Start date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Start date</Label>
              <Input type="date" value={startDate} max={todayISO()} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Target date</Label>
              <Input type="date" value={targetDate} min={startDate || undefined} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>

          {/* Confirm start value */}
          <div className="rounded-md border bg-muted/30 p-3 space-y-2">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-amber-600 shrink-0" />
              <span>
                Confirm the {METRIC_META[metric].short} count on <strong>{startDate ? format(new Date(startDate), "d MMM yyyy") : "start date"}</strong>.
                {snapshot.value != null && (
                  <> Suggested from your data: <strong>{snapshot.value.toLocaleString()}</strong> <span className="opacity-70">({snapshot.source})</span>.</>
                )}
                {snapshot.value == null && <> No data found — please enter manually.</>}
              </span>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Starting {METRIC_META[metric].short}</Label>
                <Input
                  type="number"
                  value={startValue}
                  onChange={(e) => { setStartValue(e.target.value); setConfirmedStart(false); }}
                  placeholder="e.g. 6900"
                />
              </div>
              <Button
                type="button"
                variant={confirmedStart ? "default" : "outline"}
                size="sm"
                disabled={!startValue || Number.isNaN(Number(startValue))}
                onClick={() => setConfirmedStart(true)}
              >
                {confirmedStart ? "Confirmed ✓" : "Confirm"}
              </Button>
            </div>
          </div>

          {/* Target value */}
          <div className="space-y-1.5">
            <Label className="text-xs">Target {METRIC_META[metric].short}</Label>
            <Input
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder={metric === "followers" ? "e.g. 30000" : "e.g. 100"}
            />
            {validNumbers && validDates && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                That's <strong className="mx-1">{(targetNum - startNum).toLocaleString()}</strong>
                {METRIC_META[metric].short} over <strong className="mx-1">{daysBetween(startDate, targetDate)}</strong> days
                · <Badge variant="secondary" className="ml-1 font-mono">
                  {((targetNum - startNum) / Math.max(1, daysBetween(startDate, targetDate))).toFixed(1)}/day
                </Badge>
              </p>
            )}
          </div>

          {/* Optional: mirror to main Goals module */}
          {!editing && (
            <div className="flex items-start justify-between gap-3 rounded-md border p-3">
              <div>
                <Label htmlFor="mirror-goal" className="text-sm font-medium">Also add to main Goals module</Label>
                <p className="text-[11px] text-muted-foreground">Creates a linked goal under the "Social" category so it counts toward your overall goal tracking.</p>
              </div>
              <Switch id="mirror-goal" checked={mirror} onCheckedChange={setMirror} />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Series-A launch quarter" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!canSave}>
            {upsert.isPending ? "Saving…" : editing ? "Save changes" : "Save goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

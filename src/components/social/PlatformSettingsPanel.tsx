import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { X, Plus, Loader2, FileSpreadsheet, Link2, Link2Off, ExternalLink, Pencil, Check, UserCog } from "lucide-react";
import { Link } from "react-router-dom";
import { PLATFORM_META, SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/social";
import { useSocialPlatformSettings, useUpsertPlatformSettings } from "@/hooks/useSocialPlatformSettings";
import { useLogFollowerCount, useFollowerGrowth } from "@/hooks/useFollowerGrowth";
import { useProfileSocialLinks, useUpdateProfileSocialLink, PLATFORM_TO_PROFILE_FIELD } from "@/hooks/useProfileSocialLinks";
import { getLocalDateString } from "@/utils/dateUtils";
import { AggregateImportDialog } from "./AggregateImportDialog";
import { ImportHistoryPanel } from "./ImportHistoryPanel";
import { GoalsCard } from "./GoalsCard";

export function PlatformSettingsPanel() {
  const { data: settings = [], isLoading } = useSocialPlatformSettings();
  const { data: profileLinks = {} } = useProfileSocialLinks();
  const { data: growth = [] } = useFollowerGrowth();
  const upsert = useUpsertPlatformSettings();
  const logFollowers = useLogFollowerCount();
  const [importOpen, setImportOpen] = useState(false);

  const byPlatform = Object.fromEntries(settings.map((s) => [s.platform, s]));
  const hasDataByPlatform = growth.reduce<Record<string, boolean>>((acc, g) => {
    acc[g.platform] = true;
    return acc;
  }, {});

  if (isLoading) {
    return <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-muted/30 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl space-y-1">
          <p className="text-sm text-muted-foreground">
            Link the accounts you want to track. These are the same social links shown on your{" "}
            <Link to="/profile" className="underline underline-offset-2 hover:text-foreground">profile</Link>
            {" "}— editing either side keeps both in sync.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
          <FileSpreadsheet className="h-3.5 w-3.5" /> Import aggregate analytics
        </Button>
      </Card>

      {SOCIAL_PLATFORMS.map((platform) => {
        const s = byPlatform[platform];
        const Icon = PLATFORM_META[platform].icon;
        const profileField = PLATFORM_TO_PROFILE_FIELD[platform];
        const profileUrl = (profileLinks[profileField] ?? "") as string;
        const enabled = s?.enabled ?? false;
        const hasData = !!hasDataByPlatform[platform];
        const status = computeStatus({ url: profileUrl, enabled, hasData });
        return (
          <Card key={platform} className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${PLATFORM_META[platform].color}`} />
                <h3 className="text-base font-semibold">{PLATFORM_META[platform].label}</h3>
                <StatusBadge status={status} />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`${platform}-enabled`} className="text-xs text-muted-foreground">
                  Tracking
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Switch
                        id={`${platform}-enabled`}
                        checked={enabled}
                        onCheckedChange={(v) =>
                          upsert.mutate({ platform, enabled: v, ...(s ? {} : { pillars: [] }) })
                        }
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {enabled ? "Turn off to stop tracking metrics for this account" : "Turn on to start tracking follower growth and posts"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <LinkedAccountRow platform={platform} url={profileUrl} />



            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Current followers</Label>
                <CurrentFollowersInput
                  platform={platform}
                  initial={s?.current_followers_cached ?? null}
                  onLog={(n) =>
                    logFollowers.mutate({
                      platform,
                      date: getLocalDateString(),
                      total_followers: n,
                    })
                  }
                  pending={logFollowers.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Follower target</Label>
                <Input
                  type="number"
                  defaultValue={s?.follower_target ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value === "" ? null : Number(e.target.value);
                    if (v !== (s?.follower_target ?? null)) {
                      upsert.mutate({ platform, follower_target: v });
                    }
                  }}
                  placeholder="e.g. 30000"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target deadline</Label>
                <Input
                  type="date"
                  defaultValue={s?.target_deadline ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value || null;
                    if (v !== (s?.target_deadline ?? null)) {
                      upsert.mutate({ platform, target_deadline: v });
                    }
                  }}
                />
              </div>
            </div>

            <PillarsEditor
              pillars={s?.pillars ?? []}
              onChange={(next) => upsert.mutate({ platform, pillars: next })}
            />
          </Card>
        );
      })}

      <ImportHistoryPanel />

      <AggregateImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

function CurrentFollowersInput({
  platform,
  initial,
  onLog,
  pending,
}: {
  platform: string;
  initial: number | null;
  onLog: (n: number) => void;
  pending: boolean;
}) {
  const [val, setVal] = useState<string>(initial != null ? String(initial) : "");
  return (
    <div className="flex gap-2">
      <Input
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="e.g. 6900"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!val || Number.isNaN(Number(val)) || pending}
        onClick={() => onLog(Number(val))}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Log"}
      </Button>
    </div>
  );
}

function PillarsEditor({
  pillars,
  onChange,
}: {
  pillars: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || pillars.includes(v)) return;
    onChange([...pillars, v]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <Label className="text-xs">Content pillars</Label>
      <div className="flex flex-wrap gap-2">
        {pillars.length === 0 && (
          <span className="text-xs text-muted-foreground">No pillars yet. Add one to start tagging posts.</span>
        )}
        {pillars.map((p) => (
          <Badge key={p} variant="secondary" className="gap-1">
            {p}
            <button
              type="button"
              onClick={() => onChange(pillars.filter((x) => x !== p))}
              aria-label={`Remove ${p}`}
              className="hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="e.g. fintech_infrastructure"
          maxLength={64}
        />
        <Button type="button" variant="outline" size="icon" onClick={add} aria-label="Add pillar">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

type LinkStatus = "tracking" | "linked-no-data" | "linked-paused" | "not-linked";

function computeStatus({ url, enabled, hasData }: { url: string; enabled: boolean; hasData: boolean }): LinkStatus {
  if (!url) return "not-linked";
  if (!enabled) return "linked-paused";
  return hasData ? "tracking" : "linked-no-data";
}

function StatusBadge({ status }: { status: LinkStatus }) {
  const map: Record<LinkStatus, { label: string; className: string; tip: string }> = {
    "tracking": {
      label: "Tracking",
      className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      tip: "Account is linked, tracking is on, and follower data is being recorded.",
    },
    "linked-no-data": {
      label: "Linked · no data yet",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      tip: "Account is linked and tracking is on, but no follower counts have been imported or logged yet.",
    },
    "linked-paused": {
      label: "Linked · tracking off",
      className: "bg-muted text-muted-foreground border-border",
      tip: "Account is linked but tracking is disabled. Flip the toggle to start collecting metrics.",
    },
    "not-linked": {
      label: "Not linked",
      className: "bg-destructive/10 text-destructive border-destructive/30",
      tip: "No account URL set. Add one below to start tracking.",
    },
  };
  const entry = map[status];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={`text-[10px] font-medium ${entry.className}`}>
          {entry.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{entry.tip}</TooltipContent>
    </Tooltip>
  );
}

function LinkedAccountRow({ platform, url }: { platform: SocialPlatform; url: string }) {
  const update = useUpdateProfileSocialLink();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(url);

  const save = () => {
    const next = draft.trim();
    if (next === url) {
      setEditing(false);
      return;
    }
    update.mutate(
      { platform, url: next || null },
      { onSuccess: () => setEditing(false) },
    );
  };

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed bg-muted/30 p-2.5">
        <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`https://${platform === "x" ? "x.com" : platform + ".com"}/yourhandle`}
          className="h-8 flex-1 min-w-[200px] text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); save(); }
            if (e.key === "Escape") { setDraft(url); setEditing(false); }
          }}
        />
        <Button size="sm" variant="default" onClick={save} disabled={update.isPending} className="h-8 gap-1">
          {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setDraft(url); setEditing(false); }} className="h-8">
          Cancel
        </Button>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border bg-muted/20 p-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link2Off className="h-3.5 w-3.5" />
          <span>No account linked. Add the profile URL — it will also appear on your profile.</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => { setDraft(""); setEditing(true); }} className="h-7 gap-1 text-xs">
          <Plus className="h-3 w-3" /> Link account
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 p-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <a
          href={url.startsWith("http") ? url : `https://${url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs truncate hover:underline"
          title={url}
        >
          {url.replace(/^https?:\/\//, "")}
        </a>
        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" variant="ghost" onClick={() => { setDraft(url); setEditing(true); }} className="h-7 gap-1 text-xs">
          <Pencil className="h-3 w-3" /> Edit
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
              <Link to="/profile" aria-label="Manage in profile">
                <UserCog className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Manage in profile</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}


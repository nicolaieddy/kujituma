import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2, Upload, FileSpreadsheet } from "lucide-react";
import { PLATFORM_META, SOCIAL_PLATFORMS } from "@/lib/social";
import { useSocialPlatformSettings, useUpsertPlatformSettings } from "@/hooks/useSocialPlatformSettings";
import { useLogFollowerCount } from "@/hooks/useFollowerGrowth";
import { getLocalDateString } from "@/utils/dateUtils";
import { AggregateImportDialog } from "./AggregateImportDialog";

export function PlatformSettingsPanel() {
  const { data: settings = [], isLoading } = useSocialPlatformSettings();
  const upsert = useUpsertPlatformSettings();
  const logFollowers = useLogFollowerCount();
  const [importOpen, setImportOpen] = useState(false);

  const byPlatform = Object.fromEntries(settings.map((s) => [s.platform, s]));

  if (isLoading) {
    return <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-muted/30 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <p className="text-sm text-muted-foreground">
            Choose which platforms to track, set follower targets and deadlines, and define the
            content pillars you want to publish against on each platform.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
          <FileSpreadsheet className="h-3.5 w-3.5" /> Import aggregate analytics
        </Button>
      </Card>

      {SOCIAL_PLATFORMS.map((platform) => {
        const s = byPlatform[platform];
        const Icon = PLATFORM_META[platform].icon;
        return (
          <Card key={platform} className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${PLATFORM_META[platform].color}`} />
                <h3 className="text-base font-semibold">{PLATFORM_META[platform].label}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`${platform}-enabled`} className="text-xs text-muted-foreground">
                  Enabled
                </Label>
                <Switch
                  id={`${platform}-enabled`}
                  checked={s?.enabled ?? false}
                  onCheckedChange={(v) =>
                    upsert.mutate({ platform, enabled: v, ...(s ? {} : { pillars: [] }) })
                  }
                />
              </div>
            </div>

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

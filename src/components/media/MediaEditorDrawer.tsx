import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, ExternalLink } from "lucide-react";
import {
  MEDIA_TYPES, MEDIA_STATUSES, MEDIA_URL_STATUSES, MEDIA_SENTIMENTS,
  type MediaMention, type MediaMentionInsert,
} from "@/hooks/media/useMedia";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mention: MediaMention | null;
  onSave: (patch: Omit<MediaMentionInsert, "user_id">, id?: string) => Promise<void> | void;
}

const empty: Omit<MediaMentionInsert, "user_id"> = {
  date: new Date().toISOString().slice(0, 10),
  title: "",
  outlet: "",
  type: "Article",
  url: "",
  url_status: "verify",
  summary: "",
  tags: [],
  status: "Published",
  sentiment: null,
  featured: false,
  source: "manual",
  is_public: false,
};

export function MediaEditorDrawer({ open, onOpenChange, mention, onSave }: Props) {
  const [form, setForm] = useState<Omit<MediaMentionInsert, "user_id">>(empty);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mention) {
      setForm({
        date: mention.date,
        title: mention.title,
        outlet: mention.outlet ?? "",
        type: mention.type,
        url: mention.url ?? "",
        url_status: mention.url_status,
        summary: mention.summary ?? "",
        tags: mention.tags ?? [],
        status: mention.status,
        sentiment: mention.sentiment,
        featured: mention.featured,
        source: mention.source,
        is_public: mention.is_public,
        archived_url: mention.archived_url,
      });
    } else {
      setForm(empty);
    }
    setTagInput("");
  }, [mention, open]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!form.tags?.includes(t)) set("tags", [...(form.tags ?? []), t]);
    setTagInput("");
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      await onSave(form, mention?.id);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{mention ? "Edit mention" : "Add mention"}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <Field label="Title">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={500} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><Input type="date" value={form.date as string} onChange={(e) => set("date", e.target.value)} /></Field>
            <Field label="Outlet"><Input value={form.outlet ?? ""} onChange={(e) => set("outlet", e.target.value)} maxLength={200} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={form.type as string} onValueChange={(v) => set("type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MEDIA_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status as string} onValueChange={(v) => set("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MEDIA_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="URL">
            <Input type="url" value={form.url ?? ""} onChange={(e) => set("url", e.target.value)} placeholder="https://…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Link status">
              <Select value={form.url_status as string} onValueChange={(v) => set("url_status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MEDIA_URL_STATUSES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Sentiment">
              <Select value={(form.sentiment as string) ?? "none"} onValueChange={(v) => set("sentiment", v === "none" ? null : (v as any))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {MEDIA_SENTIMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Summary">
            <Textarea value={form.summary ?? ""} onChange={(e) => set("summary", e.target.value)} rows={4} maxLength={2000} />
          </Field>
          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags?.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1">
                  {t}
                  <button onClick={() => set("tags", form.tags!.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag and press Enter"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <ToggleRow label="Featured" checked={form.featured ?? false} onChange={(v) => set("featured", v)} />
            <ToggleRow label="Public" checked={form.is_public ?? false} onChange={(v) => set("is_public", v)} />
          </div>
          {form.archived_url ? (
            <a href={form.archived_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ExternalLink className="h-3 w-3" /> Archived snapshot
            </a>
          ) : null}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? "Saving…" : mention ? "Save changes" : "Add mention"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  useCreateStory, useUpdateStory, useDeleteStory,
  type MediaStory,
} from "@/hooks/media/useMedia";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  story?: MediaStory | null;
}

export function MediaStoryDialog({ open, onOpenChange, story }: Props) {
  const create = useCreateStory();
  const update = useUpdateStory();
  const del = useDeleteStory();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [coverUrl, setCoverUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (story) {
      setTitle(story.title);
      setSummary(story.summary ?? "");
      setDate(story.announcement_date);
      setCoverUrl(story.cover_url ?? "");
      setIsPublic(story.is_public);
      setFeatured(story.featured);
    } else {
      setTitle(""); setSummary(""); setDate(new Date().toISOString().slice(0, 10));
      setCoverUrl(""); setIsPublic(false); setFeatured(false);
    }
  }, [story, open]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const patch = {
        title: title.trim(),
        summary: summary.trim() || null,
        announcement_date: date,
        cover_url: coverUrl.trim() || null,
        is_public: isPublic,
        featured,
      };
      if (story) await update.mutateAsync({ id: story.id, patch });
      else await create.mutateAsync(patch);
      toast.success(story ? "Story updated" : "Story created");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!story) return;
    if (!confirm(`Delete story "${story.title}"? Linked mentions will be ungrouped.`)) return;
    try {
      await del.mutateAsync(story.id);
      toast.success("Story deleted");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{story ? "Edit story" : "New story / announcement"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Series A announcement" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Cover image URL"><Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" /></Field>
          </div>
          <Field label="Summary">
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <ToggleRow label="Public" checked={isPublic} onChange={setIsPublic} />
            <ToggleRow label="Featured" checked={featured} onChange={setFeatured} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {story && <Button variant="ghost" className="text-destructive mr-auto" onClick={handleDelete}>Delete</Button>}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

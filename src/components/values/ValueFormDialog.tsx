import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserValue, ValueVisibility } from "@/types/values";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: UserValue | null;
  onSubmit: (data: { label: string; statement: string; feeling: string | null; visibility: ValueVisibility }) => void;
}

export const ValueFormDialog = ({ open, onOpenChange, initial, onSubmit }: Props) => {
  const [label, setLabel] = useState("");
  const [statement, setStatement] = useState("");
  const [feeling, setFeeling] = useState("");
  const [visibility, setVisibility] = useState<ValueVisibility>("private");

  useEffect(() => {
    if (open) {
      setLabel(initial?.label ?? "");
      setStatement(initial?.statement ?? "");
      setFeeling(initial?.feeling ?? "");
      setVisibility(initial?.visibility ?? "private");
    }
  }, [open, initial]);

  const submit = () => {
    if (!label.trim()) return;
    onSubmit({
      label: label.trim(),
      statement: statement.trim(),
      feeling: feeling.trim() || null,
      visibility,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit value" : "Add a value"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Integrity" />
          </div>
          <div className="space-y-2">
            <Label>Statement</Label>
            <Textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="At ease when my actions reflect my words."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Write it as "I feel… when…" — this is what the AI uses to align goals to your values.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Feeling (optional)</Label>
              <Input value={feeling} onChange={(e) => setFeeling(e.target.value)} placeholder="At ease" />
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as ValueVisibility)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private — only me</SelectItem>
                  <SelectItem value="public">Public — visible on profile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!label.trim()}>{initial ? "Save" : "Add value"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

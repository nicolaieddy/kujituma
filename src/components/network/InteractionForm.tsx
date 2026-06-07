import { useState, useEffect } from "react";
import { useCreateInteraction, useUpdateInteraction, Interaction } from "@/hooks/network/useNetworkData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import RichTextEditor from "@/components/network/RichTextEditor";
import { ArrowUpRight, ArrowDownLeft, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const interactionTypes = ["Call", "Meeting", "Dinner", "Conference", "Event", "Message"];

interface InteractionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  interaction?: Interaction | null;
}

const directionOptions = [
  { value: "gave", label: "I helped them", icon: ArrowUpRight, color: "text-green-600 dark:text-green-400 border-green-500/50 bg-green-500/10" },
  { value: "received", label: "They helped me", icon: ArrowDownLeft, color: "text-blue-600 dark:text-blue-400 border-blue-500/50 bg-blue-500/10" },
  { value: "", label: "Neutral", icon: Minus, color: "text-muted-foreground border-border bg-muted/50" },
];

const InteractionForm = ({ open, onOpenChange, contactId, interaction }: InteractionFormProps) => {
  const createInteraction = useCreateInteraction();
  const updateInteraction = useUpdateInteraction();
  const today = new Date().toISOString().split("T")[0];
  const isEditing = !!interaction;

  const [form, setForm] = useState({
    date: today,
    type: "Call" as string,
    summary: "",
    follow_up_date: "",
    direction: "",
  });

  useEffect(() => {
    if (interaction) {
      setForm({
        date: interaction.date,
        type: interaction.type,
        summary: interaction.summary || "",
        follow_up_date: interaction.follow_up_date || "",
        direction: interaction.direction || "",
      });
    } else {
      setForm({ date: today, type: "Call", summary: "", follow_up_date: "", direction: "" });
    }
  }, [interaction, today]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateInteraction.mutateAsync({
          id: interaction.id,
          contactId,
          date: form.date,
          type: form.type,
          summary: form.summary || null,
          follow_up_date: form.follow_up_date || null,
          direction: form.direction || null,
        });
        toast.success("Interaction updated");
      } else {
        await createInteraction.mutateAsync({
          contact_id: contactId,
          date: form.date,
          type: form.type,
          summary: form.summary || null,
          follow_up_date: form.follow_up_date || null,
          direction: form.direction || null,
        });
        toast.success("Interaction logged");
      }
      onOpenChange(false);
      if (!isEditing) {
        setForm({ date: today, type: "Call", summary: "", follow_up_date: "", direction: "" });
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const isPending = createInteraction.isPending || updateInteraction.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Interaction" : "Log Interaction"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {interactionTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reciprocity Direction */}
          <div className="space-y-2">
            <Label>Who benefited?</Label>
            <div className="flex gap-2">
              {directionOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = form.direction === opt.value;
                return (
                  <button
                    key={opt.value || "neutral"}
                    type="button"
                    onClick={() => set("direction", opt.value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all",
                      isActive ? opt.color : "border-transparent text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Summary</Label>
            <RichTextEditor value={form.summary} onChange={(v) => set("summary", v)} />
          </div>
          <div className="space-y-2">
            <Label>Follow-up Date</Label>
            <Input type="date" value={form.follow_up_date} onChange={(e) => set("follow_up_date", e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isEditing ? "Save" : "Log"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InteractionForm;

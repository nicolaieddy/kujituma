import { useState } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAddLabPanel } from "@/hooks/useLabPanels";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MarkerDraft {
  marker_label: string;
  value: string;
  unit: string;
  ref_low: string;
  ref_high: string;
}

const EMPTY_MARKER: MarkerDraft = {
  marker_label: "",
  value: "",
  unit: "",
  ref_low: "",
  ref_high: "",
};

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");

export function AddLabPanelSheet({ open, onOpenChange }: Props) {
  const [takenOn, setTakenOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [panelName, setPanelName] = useState("");
  const [provider, setProvider] = useState("");
  const [notes, setNotes] = useState("");
  const [markers, setMarkers] = useState<MarkerDraft[]>([{ ...EMPTY_MARKER }]);

  const add = useAddLabPanel();

  const reset = () => {
    setTakenOn(format(new Date(), "yyyy-MM-dd"));
    setPanelName("");
    setProvider("");
    setNotes("");
    setMarkers([{ ...EMPTY_MARKER }]);
  };

  const updateMarker = (idx: number, patch: Partial<MarkerDraft>) => {
    setMarkers((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const removeMarker = (idx: number) => {
    setMarkers((prev) => (prev.length === 1 ? [{ ...EMPTY_MARKER }] : prev.filter((_, i) => i !== idx)));
  };

  const handleSave = async () => {
    if (!panelName.trim()) {
      toast.error("Give the panel a name");
      return;
    }
    const cleanMarkers = markers
      .filter((m) => m.marker_label.trim())
      .map((m) => ({
        marker_key: slug(m.marker_label),
        marker_label: m.marker_label.trim(),
        value_numeric: m.value.trim() && !isNaN(Number(m.value)) ? Number(m.value) : null,
        value_text: m.value.trim() && isNaN(Number(m.value)) ? m.value.trim() : null,
        unit: m.unit.trim() || null,
        reference_low: m.ref_low.trim() ? Number(m.ref_low) : null,
        reference_high: m.ref_high.trim() ? Number(m.ref_high) : null,
      }));

    try {
      await add.mutateAsync({
        taken_on: takenOn,
        panel_name: panelName.trim(),
        lab_provider: provider.trim() || null,
        notes: notes.trim() || null,
        values: cleanMarkers,
      });
      toast.success("Lab panel added");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Add lab panel</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lp-date">Date taken</Label>
              <Input id="lp-date" type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lp-provider">Provider</Label>
              <Input
                id="lp-provider"
                placeholder="Quest, LabCorp..."
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="lp-name">Panel name</Label>
              <Input
                id="lp-name"
                placeholder="Lipid panel, CBC, Hormone..."
                value={panelName}
                onChange={(e) => setPanelName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Markers</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMarkers((prev) => [...prev, { ...EMPTY_MARKER }])}
              >
                <Plus className="h-4 w-4" /> Add row
              </Button>
            </div>
            <div className="space-y-2">
              {markers.map((m, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border bg-card/60 p-2 space-y-2"
                >
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5 space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Marker</Label>
                      <Input
                        placeholder="HDL"
                        value={m.marker_label}
                        onChange={(e) => updateMarker(idx, { marker_label: e.target.value })}
                      />
                    </div>
                    <div className="col-span-4 space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Value</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="55"
                        value={m.value}
                        onChange={(e) => updateMarker(idx, { value: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Unit</Label>
                      <Input
                        placeholder="mg/dL"
                        value={m.unit}
                        onChange={(e) => updateMarker(idx, { unit: e.target.value })}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMarker(idx)}
                        aria-label="Remove marker"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="col-span-6 space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Ref low</Label>
                      <Input
                        inputMode="decimal"
                        value={m.ref_low}
                        onChange={(e) => updateMarker(idx, { ref_low: e.target.value })}
                      />
                    </div>
                    <div className="col-span-6 space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Ref high</Label>
                      <Input
                        inputMode="decimal"
                        value={m.ref_high}
                        onChange={(e) => updateMarker(idx, { ref_high: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lp-notes">Notes</Label>
            <Textarea
              id="lp-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Fasting state, context, doctor's observations..."
            />
          </div>
        </div>
        <SheetFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={add.isPending}>
            Save panel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

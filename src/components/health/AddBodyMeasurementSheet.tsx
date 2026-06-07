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
import { toast } from "sonner";
import { useAddBodyMeasurement } from "@/hooks/useBodyMeasurements";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBodyMeasurementSheet({ open, onOpenChange }: Props) {
  const [measuredOn, setMeasuredOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [leanMass, setLeanMass] = useState("");
  const [waist, setWaist] = useState("");
  const [rhr, setRhr] = useState("");
  const [notes, setNotes] = useState("");

  const add = useAddBodyMeasurement();

  const num = (s: string) => (s.trim() ? Number(s) : null);

  const reset = () => {
    setMeasuredOn(format(new Date(), "yyyy-MM-dd"));
    setWeight("");
    setBodyFat("");
    setLeanMass("");
    setWaist("");
    setRhr("");
    setNotes("");
  };

  const handleSave = async () => {
    try {
      await add.mutateAsync({
        measured_on: measuredOn,
        weight_kg: num(weight),
        body_fat_pct: num(bodyFat),
        lean_mass_kg: num(leanMass),
        waist_cm: num(waist),
        resting_hr: num(rhr) != null ? Math.round(num(rhr) as number) : null,
        notes: notes.trim() || null,
      });
      toast.success("Measurement saved");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Add body measurement</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <Label htmlFor="bm-date">Date</Label>
            <Input
              id="bm-date"
              type="date"
              value={measuredOn}
              onChange={(e) => setMeasuredOn(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bm-weight">Weight (kg)</Label>
              <Input id="bm-weight" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bm-bf">Body fat %</Label>
              <Input id="bm-bf" inputMode="decimal" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bm-lean">Lean mass (kg)</Label>
              <Input id="bm-lean" inputMode="decimal" value={leanMass} onChange={(e) => setLeanMass(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bm-waist">Waist (cm)</Label>
              <Input id="bm-waist" inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="bm-rhr">Resting HR (bpm)</Label>
              <Input id="bm-rhr" inputMode="numeric" value={rhr} onChange={(e) => setRhr(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bm-notes">Notes</Label>
            <Textarea
              id="bm-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context (post-workout, time of day, etc.)"
            />
          </div>
        </div>
        <SheetFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={add.isPending}>
            Save measurement
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

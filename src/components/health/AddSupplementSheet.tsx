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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAddSupplement } from "@/hooks/useSupplements";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSupplementSheet({ open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [unit, setUnit] = useState("mg");
  const [schedule, setSchedule] = useState("daily");
  const [startedOn, setStartedOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  const add = useAddSupplement();

  const reset = () => {
    setName("");
    setDose("");
    setUnit("mg");
    setSchedule("daily");
    setStartedOn(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Give it a name");
      return;
    }
    try {
      await add.mutateAsync({
        name: name.trim(),
        dose: dose.trim() ? Number(dose) : null,
        dose_unit: unit || null,
        schedule,
        started_on: startedOn || null,
        notes: notes.trim() || null,
      });
      toast.success("Supplement added");
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
          <SheetTitle>Add supplement</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <Label htmlFor="sp-name">Name</Label>
            <Input
              id="sp-name"
              placeholder="Vitamin D3, Creatine..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="sp-dose">Dose</Label>
              <Input
                id="sp-dose"
                inputMode="decimal"
                placeholder="5000"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-unit">Unit</Label>
              <Input id="sp-unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Schedule</Label>
            <Select value={schedule} onValueChange={setSchedule}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekdays">Weekdays</SelectItem>
                <SelectItem value="custom">Custom / as needed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-started">Started on</Label>
            <Input
              id="sp-started"
              type="date"
              value={startedOn}
              onChange={(e) => setStartedOn(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-notes">Notes</Label>
            <Textarea
              id="sp-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why you take it, time of day, brand..."
            />
          </div>
        </div>
        <SheetFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={add.isPending}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

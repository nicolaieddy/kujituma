import { useEffect, useState } from "react";
import { Save, Plus } from "lucide-react";
import type { CreateTrainingWorkoutData, TrainingPlanWorkout } from "@/hooks/useTrainingPlan";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DAY_OPTIONS, WORKOUT_TYPES } from "@/components/thisweek/trainingPlanUtils";

interface TrainingWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingWorkout: TrainingPlanWorkout | null;
  onSave: (data: Omit<CreateTrainingWorkoutData, "week_start" | "goal_id">) => Promise<void>;
  isSaving: boolean;
}

function formatPaceInput(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parsePace(pace: string): number | null {
  if (!pace) return null;
  const parts = pace.split(":");
  if (parts.length !== 2) return null;

  const m = Number.parseInt(parts[0], 10);
  const s = Number.parseInt(parts[1], 10);
  if (Number.isNaN(m) || Number.isNaN(s)) return null;

  return m * 60 + s;
}

export function TrainingWorkoutDialog({
  open,
  onOpenChange,
  editingWorkout,
  onSave,
  isSaving,
}: TrainingWorkoutDialogProps) {
  const [dayOfWeek, setDayOfWeek] = useState("0");
  const [workoutType, setWorkoutType] = useState("Run");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDistanceKm, setTargetDistanceKm] = useState("");
  const [targetDurationMin, setTargetDurationMin] = useState("");
  const [targetPace, setTargetPace] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;

    if (editingWorkout) {
      setDayOfWeek(String(editingWorkout.day_of_week));
      setWorkoutType(editingWorkout.workout_type);
      setTitle(editingWorkout.title);
      setDescription(editingWorkout.description || "");
      setTargetDistanceKm(editingWorkout.target_distance_meters ? String(editingWorkout.target_distance_meters / 1000) : "");
      setTargetDurationMin(editingWorkout.target_duration_seconds ? String(Math.round(editingWorkout.target_duration_seconds / 60)) : "");
      setTargetPace(editingWorkout.target_pace_per_km ? formatPaceInput(editingWorkout.target_pace_per_km) : "");
      setNotes(editingWorkout.notes || "");
      return;
    }

    setDayOfWeek("0");
    setWorkoutType("Run");
    setTitle("");
    setDescription("");
    setTargetDistanceKm("");
    setTargetDurationMin("");
    setTargetPace("");
    setNotes("");
  }, [editingWorkout, open]);

  const handleSubmit = async () => {
    await onSave({
      day_of_week: Number.parseInt(dayOfWeek, 10),
      workout_type: workoutType,
      title: title.trim() || workoutType,
      description: description.trim(),
      target_distance_meters: targetDistanceKm ? Math.round(Number.parseFloat(targetDistanceKm) * 1000) : null,
      target_duration_seconds: targetDurationMin ? Math.round(Number.parseFloat(targetDurationMin) * 60) : null,
      target_pace_per_km: parsePace(targetPace.trim()),
      notes: notes.trim(),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle>{editingWorkout ? "Edit workout" : "Add workout"}</DialogTitle>
          <DialogDescription>
            Keep each session as its own item. Plans imported from Claude will also split <strong>PM:</strong> sessions automatically.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Day</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Workout type</Label>
                <Select value={workoutType} onValueChange={setWorkoutType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKOUT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Tempo run, PM core, long run..."
              />
            </div>

            <div className="space-y-2">
              <Label>Session details</Label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Warm-up, main set, cooldown, intensity guidance..."
                className="min-h-[120px]"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Distance (km)</Label>
                <Input
                  type="number"
                  value={targetDistanceKm}
                  onChange={(event) => setTargetDistanceKm(event.target.value)}
                  placeholder="10"
                  step="0.1"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  value={targetDurationMin}
                  onChange={(event) => setTargetDurationMin(event.target.value)}
                  placeholder="45"
                  step="1"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Target pace</Label>
                <Input
                  value={targetPace}
                  onChange={(event) => setTargetPace(event.target.value)}
                  placeholder="5:30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Fueling, gear, recovery notes, or coach reminders"
                className="min-h-[88px]"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} loading={isSaving}>
            {editingWorkout ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingWorkout ? "Save changes" : "Add workout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

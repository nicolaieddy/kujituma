import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import type { TrainingPlanWorkout, CreateTrainingWorkoutData } from "@/hooks/useTrainingPlan";

const DAY_OPTIONS = [
  { value: "0", label: "Monday" },
  { value: "1", label: "Tuesday" },
  { value: "2", label: "Wednesday" },
  { value: "3", label: "Thursday" },
  { value: "4", label: "Friday" },
  { value: "5", label: "Saturday" },
  { value: "6", label: "Sunday" },
];

const WORKOUT_TYPES = ["Run", "Ride", "Swim", "Walk", "Hike", "Yoga", "WeightTraining", "Workout"];

interface TrainingWorkoutEditorProps {
  weekStart: string;
  goalId: string | null;
  editingWorkout: TrainingPlanWorkout | null;
  onSave: (data: Omit<CreateTrainingWorkoutData, "week_start" | "goal_id">) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export function TrainingWorkoutEditor({
  editingWorkout,
  onSave,
  onCancel,
  isSaving,
}: TrainingWorkoutEditorProps) {
  const [dayOfWeek, setDayOfWeek] = useState("0");
  const [workoutType, setWorkoutType] = useState("Run");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDistanceKm, setTargetDistanceKm] = useState("");
  const [targetDurationMin, setTargetDurationMin] = useState("");
  const [targetPace, setTargetPace] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (editingWorkout) {
      setDayOfWeek(String(editingWorkout.day_of_week));
      setWorkoutType(editingWorkout.workout_type);
      setTitle(editingWorkout.title);
      setDescription(editingWorkout.description || "");
      setTargetDistanceKm(editingWorkout.target_distance_meters ? String(editingWorkout.target_distance_meters / 1000) : "");
      setTargetDurationMin(editingWorkout.target_duration_seconds ? String(Math.round(editingWorkout.target_duration_seconds / 60)) : "");
      setTargetPace(editingWorkout.target_pace_per_km ? formatPaceInput(editingWorkout.target_pace_per_km) : "");
      setNotes(editingWorkout.notes || "");
    } else {
      resetForm();
    }
  }, [editingWorkout]);

  const resetForm = () => {
    setDayOfWeek("0");
    setWorkoutType("Run");
    setTitle("");
    setDescription("");
    setTargetDistanceKm("");
    setTargetDurationMin("");
    setTargetPace("");
    setNotes("");
  };

  const formatPaceInput = (secPerKm: number): string => {
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const parsePace = (pace: string): number | null => {
    if (!pace) return null;
    const parts = pace.split(":");
    if (parts.length !== 2) return null;
    const m = parseInt(parts[0]);
    const s = parseInt(parts[1]);
    if (isNaN(m) || isNaN(s)) return null;
    return m * 60 + s;
  };

  const handleSubmit = async () => {
    await onSave({
      day_of_week: parseInt(dayOfWeek),
      workout_type: workoutType,
      title: title || workoutType,
      description,
      target_distance_meters: targetDistanceKm ? parseFloat(targetDistanceKm) * 1000 : null,
      target_duration_seconds: targetDurationMin ? parseInt(targetDurationMin) * 60 : null,
      target_pace_per_km: parsePace(targetPace),
      notes,
    });
    if (!editingWorkout) resetForm();
  };

  return (
    <div className="rounded-lg border border-dashed border-primary/30 p-3 space-y-3 bg-muted/30">
      <div className="text-xs font-medium text-foreground">{editingWorkout ? "Edit Workout" : "Add Workout"}</div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Day</Label>
          <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map(d => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={workoutType} onValueChange={setWorkoutType}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {WORKOUT_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Tempo Run, Long Run, Recovery"
          className="h-8 text-xs"
        />
      </div>

      <div>
        <Label className="text-xs">Description (coach instructions)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. 10min warmup, 20min at tempo pace, 10min cooldown"
          className="text-xs min-h-[60px]"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Distance (km)</Label>
          <Input
            type="number"
            value={targetDistanceKm}
            onChange={(e) => setTargetDistanceKm(e.target.value)}
            placeholder="10"
            className="h-8 text-xs"
            step="0.1"
          />
        </div>
        <div>
          <Label className="text-xs">Duration (min)</Label>
          <Input
            type="number"
            value={targetDurationMin}
            onChange={(e) => setTargetDurationMin(e.target.value)}
            placeholder="45"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Pace (/km)</Label>
          <Input
            value={targetPace}
            onChange={(e) => setTargetPace(e.target.value)}
            placeholder="5:30"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Notes</Label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes"
          className="h-8 text-xs"
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={isSaving} className="text-xs h-7">
          <Plus className="h-3 w-3 mr-1" />
          {editingWorkout ? "Update" : "Add"}
        </Button>
        {editingWorkout && (
          <Button size="sm" variant="ghost" onClick={onCancel} className="text-xs h-7">
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

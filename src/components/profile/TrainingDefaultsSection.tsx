import { useState, useEffect } from "react";
import { useWorkoutPreferences } from "@/hooks/useWorkoutPreferences";
import { useGoals } from "@/hooks/useGoals";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Target } from "lucide-react";
import { toast } from "sonner";

export function TrainingDefaultsSection() {
  const { prefs, isLoading, updatePrefs, isSaving } = useWorkoutPreferences();
  const { goals } = useGoals();
  const activeGoals = (goals || []).filter(
    (g: any) => g.status === "in_progress" || g.status === "not_started",
  );

  const [goalId, setGoalId] = useState<string>(prefs.default_goal_id ?? "none");
  const [autoLink, setAutoLink] = useState<boolean>(prefs.auto_link_activities);
  const [autoObj, setAutoObj] = useState<boolean>(prefs.auto_create_weekly_objective);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setGoalId(prefs.default_goal_id ?? "none");
    setAutoLink(prefs.auto_link_activities);
    setAutoObj(prefs.auto_create_weekly_objective);
  }, [prefs.default_goal_id, prefs.auto_link_activities, prefs.auto_create_weekly_objective]);

  const handleSave = async () => {
    try {
      await updatePrefs({
        default_goal_id: goalId === "none" ? null : goalId,
        auto_link_activities: autoLink,
        auto_create_weekly_objective: autoObj,
      });
      setDirty(false);
      toast.success("Training defaults saved");
    } catch (err: any) {
      toast.error("Failed to save", { description: err.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" />
          Training defaults
        </CardTitle>
        <CardDescription>
          Pick a default goal so new activities and weekly plans link automatically — no need to tag each one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Default training goal</Label>
          <Select
            value={goalId}
            onValueChange={(v) => {
              setGoalId(v);
              setDirty(true);
            }}
          >
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {activeGoals.map((g: any) => (
                <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[12px] text-muted-foreground">
            Applies going forward. You can still override per workout.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-medium">Auto-link new activities</Label>
            <p className="text-[12px] text-muted-foreground">
              Strava, .FIT and Garmin sessions get linked to this goal as they sync.
            </p>
          </div>
          <Switch
            checked={autoLink}
            onCheckedChange={(v) => { setAutoLink(v); setDirty(true); }}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-medium">Auto-create a weekly objective</Label>
            <p className="text-[12px] text-muted-foreground">
              We'll create one weekly objective under this goal summarizing your training plan.
            </p>
          </div>
          <Switch
            checked={autoObj}
            onCheckedChange={(v) => { setAutoObj(v); setDirty(true); }}
          />
        </div>

        {dirty && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { useWorkoutPreferences, type WorkoutPrefs } from "@/hooks/useWorkoutPreferences";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FitFileUploadCard } from "@/components/training/FitFileUploadCard";
import { Dumbbell, Ruler, Thermometer, Gauge, Zap, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function PreferenceRow({ icon: Icon, label, description, children }: {
  icon: React.ElementType;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-[12px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="shrink-0 w-[160px]">{children}</div>
    </div>
  );
}

export function WorkoutPreferencesSection() {
  const { prefs, isLoading, updatePrefs, isSaving } = useWorkoutPreferences();
  const [local, setLocal] = useState<WorkoutPrefs>(prefs);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLocal(prefs);
  }, [prefs]);

  const handleChange = (key: keyof WorkoutPrefs, value: string) => {
    setLocal(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      const { id, ...updates } = local;
      await updatePrefs(updates);
      setDirty(false);
      toast.success("Workout preferences saved");
    } catch (err: any) {
      toast.error("Failed to save preferences", { description: err.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Dumbbell className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Workouts</h2>
      </div>

      <p className="text-muted-foreground text-sm">
        Configure display units and preferences for your workout data.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Display Units</CardTitle>
          <CardDescription>
            Choose how distances, pace, elevation, and other metrics are displayed throughout the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 divide-y divide-border/50">
          <PreferenceRow icon={Ruler} label="Distance" description="How distances are shown">
            <Select value={local.distance_unit} onValueChange={v => handleChange("distance_unit", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="km">Kilometers (km)</SelectItem>
                <SelectItem value="mi">Miles (mi)</SelectItem>
              </SelectContent>
            </Select>
          </PreferenceRow>

          <PreferenceRow icon={Gauge} label="Pace" description="Pace display format">
            <Select value={local.pace_format} onValueChange={v => handleChange("pace_format", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="min_per_km">min/km</SelectItem>
                <SelectItem value="min_per_mi">min/mi</SelectItem>
              </SelectContent>
            </Select>
          </PreferenceRow>

          <PreferenceRow icon={Ruler} label="Elevation" description="Height measurement">
            <Select value={local.elevation_unit} onValueChange={v => handleChange("elevation_unit", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="m">Meters (m)</SelectItem>
                <SelectItem value="ft">Feet (ft)</SelectItem>
              </SelectContent>
            </Select>
          </PreferenceRow>

          <PreferenceRow icon={Thermometer} label="Temperature" description="Temperature unit">
            <Select value={local.temperature_unit} onValueChange={v => handleChange("temperature_unit", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="celsius">Celsius (°C)</SelectItem>
                <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
              </SelectContent>
            </Select>
          </PreferenceRow>

          <PreferenceRow icon={Zap} label="Power" description="Power display mode">
            <Select value={local.power_display} onValueChange={v => handleChange("power_display", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="watts">Watts (W)</SelectItem>
                <SelectItem value="watts_per_kg">Watts/kg (W/kg)</SelectItem>
              </SelectContent>
            </Select>
          </PreferenceRow>

          <PreferenceRow icon={Ruler} label="Weight" description="Body weight unit">
            <Select value={local.weight_unit} onValueChange={v => handleChange("weight_unit", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">Kilograms (kg)</SelectItem>
                <SelectItem value="lb">Pounds (lb)</SelectItem>
              </SelectContent>
            </Select>
          </PreferenceRow>
        </CardContent>
      </Card>

      {dirty && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Preferences
          </Button>
        </div>
      )}

      <FitFileUploadCard />
    </div>
  );
}

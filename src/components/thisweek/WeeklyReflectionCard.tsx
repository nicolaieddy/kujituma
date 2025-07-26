import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAutoSave } from "@/hooks/useAutoSave";
import { AutoSaveIndicator } from "./AutoSaveIndicator";
import { useEffect } from "react";

interface WeeklyReflectionCardProps {
  initialNotes: string;
  onUpdateNotes: (notes: string) => void;
  isReadOnly: boolean;
  weekStart: string; // Add weekStart as a key for proper scoping
}

export const WeeklyReflectionCard = ({
  initialNotes,
  onUpdateNotes,
  isReadOnly,
  weekStart
}: WeeklyReflectionCardProps) => {
  const autoSave = useAutoSave({
    onSave: onUpdateNotes,
    delay: 2000,
    initialValue: initialNotes
  });

  // Force reset when week changes - critical for proper week isolation
  useEffect(() => {
    console.log('WeeklyReflectionCard: weekStart changed to', weekStart, 'initialNotes:', initialNotes);
    // Always reset the auto-save value when the week changes to ensure proper isolation
    autoSave.setValue(initialNotes);
  }, [weekStart]); // Only depend on weekStart to trigger on week changes
  
  // Reset when initialNotes change for the same week (e.g., data loading)
  useEffect(() => {
    if (initialNotes !== autoSave.value) {
      console.log('WeeklyReflectionCard: initialNotes changed, updating from', autoSave.value, 'to', initialNotes);
      autoSave.setValue(initialNotes);
    }
  }, [initialNotes]);

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Weekly Reflection</CardTitle>
            <p className="text-white/60 text-sm mt-1">
              This reflection will be included when you share your week with the community
            </p>
          </div>
          <AutoSaveIndicator
            isSaving={autoSave.isSaving}
            lastSaved={autoSave.lastSaved}
            hasUnsavedChanges={autoSave.hasUnsavedChanges}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={autoSave.value}
          onChange={(e) => autoSave.setValue(e.target.value)}
          placeholder="How did this week go? What did you learn? Any insights or challenges? This will be shared with your weekly post."
          className="bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[100px]"
          disabled={isReadOnly}
        />
      </CardContent>
    </Card>
  );
};
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAutoSave } from "@/hooks/useAutoSave";
import { AutoSaveIndicator } from "./AutoSaveIndicator";

interface WeeklyReflectionCardProps {
  initialNotes: string;
  onUpdateNotes: (notes: string) => void;
  isReadOnly: boolean;
}

export const WeeklyReflectionCard = ({
  initialNotes,
  onUpdateNotes,
  isReadOnly
}: WeeklyReflectionCardProps) => {
  const autoSave = useAutoSave({
    onSave: onUpdateNotes,
    delay: 2000,
    initialValue: initialNotes
  });

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
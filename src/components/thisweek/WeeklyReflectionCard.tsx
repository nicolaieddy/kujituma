import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useWeeklyReflection } from "@/hooks/useWeeklyReflection";
import { AutoSaveIndicator } from "./AutoSaveIndicator";

interface WeeklyReflectionCardProps {
  initialNotes: string;
  onUpdateNotes: (notes: string) => void;
  isReadOnly: boolean;
  weekStart: string; // Critical for proper week isolation
}

export const WeeklyReflectionCard = ({
  initialNotes,
  onUpdateNotes,
  isReadOnly,
  weekStart
}: WeeklyReflectionCardProps) => {
  console.log('WeeklyReflectionCard render:', { weekStart, initialNotes, isReadOnly });
  
  const reflection = useWeeklyReflection({
    weekStart,
    initialNotes,
    onSave: onUpdateNotes,
    delay: 2000,
    isReadOnly
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
            isSaving={reflection.isSaving}
            lastSaved={reflection.lastSaved}
            hasUnsavedChanges={reflection.hasUnsavedChanges}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={reflection.value}
          onChange={(e) => reflection.setValue(e.target.value)}
          placeholder="How did this week go? What did you learn? Any insights or challenges? This will be shared with your weekly post."
          className="bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[100px]"
          disabled={isReadOnly}
        />
      </CardContent>
    </Card>
  );
};
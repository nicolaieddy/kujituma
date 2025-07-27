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
    <Card className={`bg-white/10 backdrop-blur-lg border-white/20 ${isReadOnly ? 'opacity-75' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={`text-white ${isReadOnly ? 'text-white/70' : ''}`}>
              Weekly Reflection
              {isReadOnly && <span className="ml-2 text-xs text-yellow-400">🔒 Locked</span>}
            </CardTitle>
            <p className="text-white/60 text-sm mt-1">
              {isReadOnly 
                ? "This week has been shared and can no longer be edited"
                : "This reflection will be included when you share your week with the community"
              }
            </p>
          </div>
          {!isReadOnly && (
            <AutoSaveIndicator
              isSaving={reflection.isSaving}
              lastSaved={reflection.lastSaved}
              hasUnsavedChanges={reflection.hasUnsavedChanges}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={reflection.value}
          onChange={(e) => reflection.setValue(e.target.value)}
          placeholder={isReadOnly 
            ? "No reflection added for this week" 
            : "How did this week go? What did you learn? Any insights or challenges? This will be shared with your weekly post."
          }
          className={`bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[100px] ${
            isReadOnly ? 'cursor-not-allowed opacity-60' : ''
          }`}
          disabled={isReadOnly}
          readOnly={isReadOnly}
        />
        {isReadOnly && (
          <div className="text-center py-2">
            <span className="text-xs text-white/50 bg-white/5 px-3 py-1 rounded-full">
              ✅ Week completed and shared with community
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
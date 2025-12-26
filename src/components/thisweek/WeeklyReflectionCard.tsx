import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useWeeklyReflection } from "@/hooks/useWeeklyReflection";
import { AutoSaveIndicator } from "./AutoSaveIndicator";
import { Share2, Globe } from "lucide-react";

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
  
  const reflection = useWeeklyReflection({
    weekStart,
    initialNotes,
    onSave: onUpdateNotes,
    delay: 2000,
    isReadOnly
  });

  return (
    <Card className={`border-primary/30 bg-primary/5 ${isReadOnly ? 'opacity-75' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-foreground flex items-center gap-2 ${isReadOnly ? 'opacity-70' : ''}`}>
                <Share2 className="h-5 w-5 text-primary" />
                Weekly Summary
                {isReadOnly && <span className="ml-2 text-xs text-yellow-600">🔒 Locked</span>}
              </CardTitle>
              {!isReadOnly && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/20 text-primary flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Public
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {isReadOnly 
                ? "This week has been shared and can no longer be edited"
                : "Share your overall week highlights — visible to the community when you post"
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
            : "What were your wins this week? Any lessons learned or insights to share?"
          }
          className={`min-h-[100px] ${
            isReadOnly ? 'cursor-not-allowed opacity-60' : ''
          }`}
          disabled={isReadOnly}
          readOnly={isReadOnly}
        />
        {isReadOnly && (
          <div className="text-center py-2">
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
              ✅ Week completed and shared with community
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
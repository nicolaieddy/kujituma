import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useWeeklyReflection } from "@/hooks/useWeeklyReflection";
import { AutoSaveIndicator } from "./AutoSaveIndicator";
import { Share2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface WeeklyReflectionCardProps {
  initialNotes: string;
  onUpdateNotes: (notes: string) => void;
  isReadOnly: boolean;
  weekStart: string;
}

export const WeeklyReflectionCard = ({
  initialNotes,
  onUpdateNotes,
  isReadOnly,
  weekStart
}: WeeklyReflectionCardProps) => {
  const [isOpen, setIsOpen] = useState(true);
  
  const reflection = useWeeklyReflection({
    weekStart,
    initialNotes,
    onSave: onUpdateNotes,
    delay: 2000,
    isReadOnly
  });

  return (
    <Card className={`border-primary/30 bg-primary/5 ${isReadOnly ? 'opacity-75' : ''}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="w-full text-left">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-lg text-foreground flex items-center gap-2 ${isReadOnly ? 'opacity-70' : ''}`}>
                    <Share2 className="h-5 w-5 text-primary" />
                    Weekly Summary
                    {isReadOnly && <span className="ml-2 text-xs text-yellow-600">🔒 Locked</span>}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                <p className="text-muted-foreground text-sm mt-1">
                  {isReadOnly 
                    ? "This week has been closed and can no longer be edited"
                    : "Reflect on your week — what went well and what you learned"
                  }
                </p>
              </div>
              {!isReadOnly && (
                <div onClick={(e) => e.stopPropagation()}>
                  <AutoSaveIndicator
                    isSaving={reflection.isSaving}
                    lastSaved={reflection.lastSaved}
                    hasUnsavedChanges={reflection.hasUnsavedChanges}
                  />
                </div>
              )}
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
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
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

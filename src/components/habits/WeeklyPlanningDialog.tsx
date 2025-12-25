import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWeeklyPlanning } from "@/hooks/useWeeklyPlanning";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { HabitsService } from "@/services/habitsService";
import { CalendarDays, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface WeeklyPlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStart: string;
}

export const WeeklyPlanningDialog = ({ open, onOpenChange, weekStart }: WeeklyPlanningDialogProps) => {
  const { user } = useAuth();
  const { 
    planningSession,
    savePlanningSession, 
    completePlanningSession, 
    isCompleting 
  } = useWeeklyPlanning(weekStart);
  
  const [lastWeekReflection, setLastWeekReflection] = useState("");
  const [weekIntention, setWeekIntention] = useState("");
  
  useEffect(() => {
    if (planningSession) {
      setLastWeekReflection(planningSession.last_week_reflection || "");
      setWeekIntention(planningSession.week_intention || "");
    }
  }, [planningSession]);
  
  const handleComplete = async () => {
    await savePlanningSession({
      week_start: weekStart,
      last_week_reflection: lastWeekReflection,
      week_intention: weekIntention,
    });
    await completePlanningSession();
    onOpenChange(false);
  };
  
  const weekRange = WeeklyProgressService.formatWeekRange(weekStart);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Weekly Planning Ritual
          </DialogTitle>
          <DialogDescription>
            Set yourself up for success this week ({weekRange})
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Last Week Reflection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <span className="text-lg">🔙</span>
              How did last week go?
            </Label>
            <p className="text-xs text-muted-foreground">
              What worked? What didn't? What did you learn?
            </p>
            <Textarea
              value={lastWeekReflection}
              onChange={(e) => setLastWeekReflection(e.target.value)}
              placeholder="Last week I learned that..."
              className="resize-none min-h-[100px]"
            />
          </div>
          
          {/* Week Intention */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              What's your intention for this week?
            </Label>
            <p className="text-xs text-muted-foreground">
              Set 1-2 powerful intentions that will guide your week
            </p>
            <Textarea
              value={weekIntention}
              onChange={(e) => setWeekIntention(e.target.value)}
              placeholder="This week I will focus on..."
              className="resize-none min-h-[100px]"
            />
          </div>
          
          {/* Tips */}
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              💡 Planning Tips
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Choose 3-5 key objectives for the week</li>
              <li>• Schedule time blocks for deep work</li>
              <li>• Identify potential blockers early</li>
              <li>• Keep some buffer for unexpected tasks</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip for now
          </Button>
          <Button onClick={handleComplete} disabled={isCompleting}>
            {isCompleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Start My Week 🚀
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useWeeklyPlanning } from "@/hooks/useWeeklyPlanning";
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { useWeeklyInsights } from "@/hooks/useWeeklyInsights";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { useIsMobile } from "@/hooks/use-mobile";
import { CalendarDays, Loader2, Sparkles, Target, CheckCircle, Circle, Brain, RefreshCw, Heart, MessageCircle, Shield, Users, Activity as ActivityIcon } from "lucide-react";
import { hapticSuccess } from "@/utils/haptic";
import { CachedDataIndicator } from "@/components/pwa/CachedDataIndicator";
import { subDays, format, parseISO } from "date-fns";
import { useWeekActivityReflections } from "@/hooks/useWeekActivityReflections";

interface WeeklyPlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStart: string;
}

export const WeeklyPlanningDialog = ({ open, onOpenChange, weekStart }: WeeklyPlanningDialogProps) => {
  const isMobile = useIsMobile();
  const { 
    planningSession,
    savePlanningSession, 
    completePlanningSession, 
    isCompleting,
    isCached,
    lastSync
  } = useWeeklyPlanning(weekStart);
  
  // Get current week's objectives
  const { objectives: currentWeekObjectives } = useWeeklyProgress(weekStart);
  
  // Get last week's data for AI summary
  const lastWeekStartDate = subDays(new Date(weekStart + 'T00:00:00'), 7);
  const lastWeekStart = WeeklyProgressService.getWeekStart(lastWeekStartDate);
  const { planningSession: lastWeekPlanning } = useWeeklyPlanning(lastWeekStart);
  const { objectives: lastWeekObjectives, progressPost: lastWeekProgress } = useWeeklyProgress(lastWeekStart);

  // Activity reflections from last week (for the roll-up)
  const { data: weekReflections = [] } = useWeekActivityReflections(lastWeekStart);
  
  // AI insights
  const { insight, isLoading: isLoadingInsight, generateInsights } = useWeeklyInsights();
  const [hasRequestedInsight, setHasRequestedInsight] = useState(false);
  
  const [lastWeekReflection, setLastWeekReflection] = useState("");
  const [weekIntention, setWeekIntention] = useState("");
  const [relationshipInvestment, setRelationshipInvestment] = useState("");
  const [honestConversation, setHonestConversation] = useState("");
  const [feedbackCommitment, setFeedbackCommitment] = useState("");
  const [trustedAdvisors, setTrustedAdvisors] = useState("");
  const [identityReflection, setIdentityReflection] = useState("");
  
  useEffect(() => {
    if (planningSession) {
      setLastWeekReflection(planningSession.last_week_reflection || "");
      setWeekIntention(planningSession.week_intention || "");
      setRelationshipInvestment(planningSession.relationship_investment || "");
      setHonestConversation(planningSession.honest_conversation || "");
      setFeedbackCommitment(planningSession.feedback_commitment || "");
      setTrustedAdvisors(planningSession.trusted_advisors || "");
      setIdentityReflection(planningSession.identity_reflection || "");
    }
  }, [planningSession]);

  // Generate AI insights when dialog opens and we have last week data
  useEffect(() => {
    if (open && !hasRequestedInsight && lastWeekObjectives.length > 0) {
      setHasRequestedInsight(true);
      generateInsights({
        objectives: lastWeekObjectives.map(o => ({ text: o.text, is_completed: o.is_completed })),
        lastWeekReflection: lastWeekPlanning?.last_week_reflection || undefined,
        lastWeekIntention: lastWeekPlanning?.week_intention || undefined,
        progressNotes: lastWeekProgress?.notes || undefined,
      });
    }
  }, [open, hasRequestedInsight, lastWeekObjectives, lastWeekPlanning, lastWeekProgress, generateInsights]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setHasRequestedInsight(false);
    }
  }, [open]);

  const handleRefreshInsight = () => {
    generateInsights({
      objectives: lastWeekObjectives.map(o => ({ text: o.text, is_completed: o.is_completed })),
      lastWeekReflection: lastWeekPlanning?.last_week_reflection || undefined,
      lastWeekIntention: lastWeekPlanning?.week_intention || undefined,
      progressNotes: lastWeekProgress?.notes || undefined,
    });
  };
  
  const handleComplete = async () => {
    hapticSuccess();
    await savePlanningSession({
      week_start: weekStart,
      last_week_reflection: lastWeekReflection,
      week_intention: weekIntention,
      relationship_investment: relationshipInvestment,
      honest_conversation: honestConversation,
      feedback_commitment: feedbackCommitment,
      trusted_advisors: trustedAdvisors,
      identity_reflection: identityReflection,
    });
    await completePlanningSession();
    onOpenChange(false);
  };
  
  const weekRange = WeeklyProgressService.formatWeekRange(weekStart);
  
  const content = (
    <div className="space-y-5">
      {/* AI-Powered Insight */}
      {(insight || isLoadingInsight || lastWeekObjectives.length > 0) && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="bg-primary/20 rounded-full p-1.5 shrink-0">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">AI Coach Insights</p>
                {insight && !isLoadingInsight && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0" 
                    onClick={handleRefreshInsight}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {isLoadingInsight ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analyzing your week...
                </div>
              ) : insight ? (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {insight}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Complete some objectives to get personalized insights!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Current Week Objectives Preview */}
      {currentWeekObjectives.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Objectives for This Week
            </p>
            <Badge variant="secondary" className="text-xs">
              {currentWeekObjectives.length} planned
            </Badge>
          </div>
          <div className="space-y-2 max-h-[120px] overflow-y-auto">
            {currentWeekObjectives.slice(0, 5).map((obj) => (
              <div key={obj.id} className="flex items-center gap-2 text-sm">
                {obj.is_completed ? (
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className={obj.is_completed ? "line-through text-muted-foreground" : ""}>
                  {obj.text}
                </span>
              </div>
            ))}
            {currentWeekObjectives.length > 5 && (
              <p className="text-xs text-muted-foreground pl-6">
                +{currentWeekObjectives.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}
      
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
      
      {/* Relationship Intentions (Connect framework) */}
      <div className="space-y-4 bg-accent/30 rounded-lg p-4 border border-accent">
        <div>
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Heart className="h-4 w-4 text-destructive" />
            Relationship Intentions
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Inspired by the <em>Connect</em> framework — deepen one relationship this week
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Which relationship will you invest in this week?</Label>
          <Textarea
            value={relationshipInvestment}
            onChange={(e) => setRelationshipInvestment(e.target.value)}
            placeholder="e.g. I'll schedule a real catch-up with my sister…"
            className="resize-none min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
            What honest conversation are you avoiding?
          </Label>
          <Textarea
            value={honestConversation}
            onChange={(e) => setHonestConversation(e.target.value)}
            placeholder="e.g. I need to tell my manager that the deadline isn't realistic…"
            className="resize-none min-h-[80px]"
          />
        </div>
      </div>

      {/* Feedback & Growth (Olympic Athlete Principles) */}
      <div className="space-y-4 bg-accent/30 rounded-lg p-4 border border-accent">
        <div>
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Brain className="h-4 w-4 text-primary" />
            Feedback &amp; Growth
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Inspired by how Olympic athletes manage feedback
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">What feedback will you commit to acting on this week?</Label>
          <Textarea
            value={feedbackCommitment}
            onChange={(e) => setFeedbackCommitment(e.target.value)}
            placeholder="e.g. My manager suggested I delegate more — I'll hand off the Q3 report…"
            className="resize-none min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            Who is in your trusted feedback circle?
          </Label>
          <Textarea
            value={trustedAdvisors}
            onChange={(e) => setTrustedAdvisors(e.target.value)}
            placeholder="e.g. My mentor Sarah, my teammate Alex…"
            className="resize-none min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            Where did I tie my self-worth to an outcome this week?
          </Label>
          <Textarea
            value={identityReflection}
            onChange={(e) => setIdentityReflection(e.target.value)}
            placeholder="e.g. I felt like a failure when the proposal was rejected — but the rejection isn't about me…"
            className="resize-none min-h-[80px]"
          />
        </div>
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
          <li>• Invest in at least one relationship intentionally</li>
        </ul>
      </div>
    </div>
  );

  const footer = (
    <>
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
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader className="text-left pb-2">
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Weekly Planning Ritual
              </DrawerTitle>
              <CachedDataIndicator isCached={isCached} lastSync={lastSync} />
            </div>
            <DrawerDescription>
              Set yourself up for success this week ({weekRange})
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto flex-1 pb-4">
            {content}
          </div>
          <DrawerFooter className="pt-2">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Weekly Planning Ritual
            </DialogTitle>
            <CachedDataIndicator isCached={isCached} lastSync={lastSync} />
          </div>
          <DialogDescription>
            Set yourself up for success this week ({weekRange})
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {content}
        </div>
        <DialogFooter>
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

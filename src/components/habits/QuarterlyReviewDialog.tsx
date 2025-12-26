import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuarterlyReview } from "@/hooks/useQuarterlyReview";
import { Loader2, Trophy, AlertCircle, Lightbulb, Rocket, CheckCircle2, Clock, Pause, TrendingDown, Target } from "lucide-react";
import { useGoals } from "@/hooks/useGoals";
import { useAuth } from "@/contexts/AuthContext";
import { filterGoalsByQuarter, getQuarterName } from "@/utils/quarterUtils";
import { Progress } from "@/components/ui/progress";
import { WeeklyProgressService } from "@/services/weeklyProgressService";

interface QuarterlyReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GoalsSectionProps {
  title: string;
  icon: React.ReactNode;
  goals: { id: string; title: string; status: string }[];
  emptyMessage: string;
  variant: 'success' | 'primary' | 'muted' | 'warning';
}

const GoalsSection = ({ title, icon, goals, emptyMessage, variant }: GoalsSectionProps) => {
  if (goals.length === 0) return null;
  
  const variantStyles = {
    success: 'bg-success/10 text-success border-success/20',
    primary: 'bg-primary/10 text-primary border-primary/20',
    muted: 'bg-muted text-muted-foreground border-border',
    warning: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{title}</span>
        <span className="text-muted-foreground">({goals.length})</span>
      </div>
      <div className="space-y-1.5">
        {goals.map(goal => (
          <div 
            key={goal.id} 
            className={`text-sm px-3 py-2 rounded-md border ${variantStyles[variant]}`}
          >
            {goal.title}
          </div>
        ))}
      </div>
    </div>
  );
};

export const QuarterlyReviewDialog = ({ open, onOpenChange }: QuarterlyReviewDialogProps) => {
  const { user } = useAuth();
  const { goals } = useGoals();
  const { 
    currentReview,
    year,
    quarter,
    saveReview, 
    completeReview, 
    isCompleting,
    isSaving 
  } = useQuarterlyReview();
  
  const [wins, setWins] = useState("");
  const [challenges, setChallenges] = useState("");
  const [lessonsLearned, setLessonsLearned] = useState("");
  const [nextQuarterFocus, setNextQuarterFocus] = useState("");
  
  // Fetch weekly objectives for this quarter
  const { data: quarterObjectives } = useQuery({
    queryKey: ['quarterly-objectives', user?.id, year, quarter],
    queryFn: () => WeeklyProgressService.getObjectivesForQuarter(year, quarter),
    enabled: !!user && open,
  });
  
  // Calculate objectives stats
  const objectivesStats = useMemo(() => {
    if (!quarterObjectives) return { total: 0, completed: 0, percentage: 0 };
    const total = quarterObjectives.length;
    const completed = quarterObjectives.filter(o => o.is_completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [quarterObjectives]);
  
  // Filter goals by the current quarter
  const quarterGoals = useMemo(() => {
    if (!goals) return { completed: [], inProgress: [], notStarted: [], deprioritized: [] };
    return filterGoalsByQuarter(goals, year, quarter);
  }, [goals, year, quarter]);
  
  const totalRelevantGoals = quarterGoals.completed.length + quarterGoals.inProgress.length + quarterGoals.notStarted.length;
  const completionPercentage = totalRelevantGoals > 0 
    ? Math.round((quarterGoals.completed.length / totalRelevantGoals) * 100) 
    : 0;
  
  useEffect(() => {
    if (currentReview) {
      setWins(currentReview.wins || "");
      setChallenges(currentReview.challenges || "");
      setLessonsLearned(currentReview.lessons_learned || "");
      setNextQuarterFocus(currentReview.next_quarter_focus || "");
    }
  }, [currentReview]);
  
  const handleComplete = async () => {
    await saveReview({
      year,
      quarter,
      wins,
      challenges,
      lessons_learned: lessonsLearned,
      next_quarter_focus: nextQuarterFocus,
      goals_review: goals?.map(g => ({ id: g.id, title: g.title, status: g.status })),
    });
    await completeReview();
    onOpenChange(false);
  };
  
  const handleSave = async () => {
    await saveReview({
      year,
      quarter,
      wins,
      challenges,
      lessons_learned: lessonsLearned,
      next_quarter_focus: nextQuarterFocus,
    });
  };
  
  const hasAnyGoals = totalRelevantGoals > 0 || quarterGoals.deprioritized.length > 0;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Quarterly Review
          </DialogTitle>
          <DialogDescription>
            {getQuarterName(quarter)} {year} — Reflect on your progress and plan ahead
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Weekly Objectives Stats */}
          {objectivesStats.total > 0 && (
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Weekly Objectives</span>
                      <span className="text-sm text-muted-foreground">
                        {objectivesStats.completed} of {objectivesStats.total} completed
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={objectivesStats.percentage} className="h-2 flex-1" />
                      <span className="text-sm font-semibold text-primary">{objectivesStats.percentage}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Goals Summary Card */}
          {hasAnyGoals && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>Goals This Quarter</span>
                  {totalRelevantGoals > 0 && (
                    <span className="text-xs font-normal text-muted-foreground">
                      {quarterGoals.completed.length} of {totalRelevantGoals} completed
                    </span>
                  )}
                </CardTitle>
                {totalRelevantGoals > 0 && (
                  <div className="flex items-center gap-3 pt-2">
                    <Progress value={completionPercentage} className="h-2 flex-1" />
                    <span className="text-sm font-medium text-primary">{completionPercentage}%</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <GoalsSection
                  title="Completed"
                  icon={<CheckCircle2 className="h-4 w-4 text-success" />}
                  goals={quarterGoals.completed}
                  emptyMessage="No goals completed yet"
                  variant="success"
                />
                <GoalsSection
                  title="In Progress"
                  icon={<Clock className="h-4 w-4 text-primary" />}
                  goals={quarterGoals.inProgress}
                  emptyMessage="No goals in progress"
                  variant="primary"
                />
                <GoalsSection
                  title="Not Started"
                  icon={<Pause className="h-4 w-4 text-muted-foreground" />}
                  goals={quarterGoals.notStarted}
                  emptyMessage="No pending goals"
                  variant="muted"
                />
                <GoalsSection
                  title="Deprioritized"
                  icon={<TrendingDown className="h-4 w-4 text-orange-500" />}
                  goals={quarterGoals.deprioritized}
                  emptyMessage="No deprioritized goals"
                  variant="warning"
                />
              </CardContent>
            </Card>
          )}
          
          {/* Wins */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              What were your biggest wins this quarter?
            </Label>
            <Textarea
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              placeholder="I'm proud that I..."
              className="resize-none min-h-[80px]"
            />
          </div>
          
          {/* Challenges */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              What challenges did you face?
            </Label>
            <Textarea
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              placeholder="The biggest obstacles were..."
              className="resize-none min-h-[80px]"
            />
          </div>
          
          {/* Lessons Learned */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-blue-500" />
              What lessons did you learn?
            </Label>
            <Textarea
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              placeholder="I learned that..."
              className="resize-none min-h-[80px]"
            />
          </div>
          
          {/* Next Quarter Focus */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              What will you focus on next quarter?
            </Label>
            <Textarea
              value={nextQuarterFocus}
              onChange={(e) => setNextQuarterFocus(e.target.value)}
              placeholder="Next quarter I will..."
              className="resize-none min-h-[80px]"
            />
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={handleComplete} disabled={isCompleting}>
            {isCompleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                Complete Review ✨
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
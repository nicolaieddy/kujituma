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
import { Loader2, Trophy, AlertCircle, Lightbulb, Rocket, CheckCircle2, Clock, Pause, TrendingDown, Target, TrendingUp, Minus } from "lucide-react";
import { useGoals } from "@/hooks/useGoals";
import { useAuth } from "@/contexts/AuthContext";
import { filterGoalsByQuarter, getQuarterName } from "@/utils/quarterUtils";
import { Progress } from "@/components/ui/progress";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Helper to get previous quarter
const getPreviousQuarter = (year: number, quarter: number): { year: number; quarter: number } => {
  if (quarter === 1) {
    return { year: year - 1, quarter: 4 };
  }
  return { year, quarter: quarter - 1 };
};

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
  
  // Get previous quarter info
  const prevQuarter = useMemo(() => getPreviousQuarter(year, quarter), [year, quarter]);
  
  // Fetch weekly objectives for this quarter
  const { data: quarterObjectives } = useQuery({
    queryKey: ['quarterly-objectives', user?.id, year, quarter],
    queryFn: () => WeeklyProgressService.getObjectivesForQuarter(year, quarter),
    enabled: !!user && open,
  });
  
  // Fetch weekly objectives for previous quarter
  const { data: prevQuarterObjectives } = useQuery({
    queryKey: ['quarterly-objectives', user?.id, prevQuarter.year, prevQuarter.quarter],
    queryFn: () => WeeklyProgressService.getObjectivesForQuarter(prevQuarter.year, prevQuarter.quarter),
    enabled: !!user && open,
  });
  
  // Calculate objectives stats with comparison
  const objectivesStats = useMemo(() => {
    const total = quarterObjectives?.length || 0;
    const completed = quarterObjectives?.filter(o => o.is_completed).length || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Previous quarter stats
    const prevTotal = prevQuarterObjectives?.length || 0;
    const prevCompleted = prevQuarterObjectives?.filter(o => o.is_completed).length || 0;
    const prevPercentage = prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0;
    
    // Calculate difference
    const percentageDiff = prevTotal > 0 ? percentage - prevPercentage : null;
    const completedDiff = prevTotal > 0 ? completed - prevCompleted : null;
    
    return { 
      total, 
      completed, 
      percentage,
      prevTotal,
      prevCompleted,
      prevPercentage,
      percentageDiff,
      completedDiff,
      hasPreviousData: prevTotal > 0
    };
  }, [quarterObjectives, prevQuarterObjectives]);
  
  // Group objectives by goal for breakdown
  const objectivesByGoal = useMemo(() => {
    if (!quarterObjectives || !goals) return [];
    
    const goalMap = new Map<string | null, { goalTitle: string; total: number; completed: number }>();
    
    quarterObjectives.forEach(obj => {
      const goalId = obj.goal_id;
      const existing = goalMap.get(goalId);
      
      if (existing) {
        existing.total += 1;
        if (obj.is_completed) existing.completed += 1;
      } else {
        const goal = goals.find(g => g.id === goalId);
        goalMap.set(goalId, {
          goalTitle: goal?.title || 'Unlinked Objectives',
          total: 1,
          completed: obj.is_completed ? 1 : 0
        });
      }
    });
    
    // Convert to array and sort by total objectives (most active first)
    return Array.from(goalMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); // Top 5 goals
  }, [quarterObjectives, goals]);
  
  // Group objectives by week for chart
  const weeklyBreakdown = useMemo(() => {
    if (!quarterObjectives) return [];
    
    const weekMap = new Map<string, { week: string; weekLabel: string; total: number; completed: number }>();
    
    quarterObjectives.forEach(obj => {
      const weekStart = obj.week_start;
      const existing = weekMap.get(weekStart);
      
      if (existing) {
        existing.total += 1;
        if (obj.is_completed) existing.completed += 1;
      } else {
        // Format week label (e.g., "Jan 6")
        const date = new Date(weekStart + 'T00:00:00');
        const weekLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        weekMap.set(weekStart, {
          week: weekStart,
          weekLabel,
          total: 1,
          completed: obj.is_completed ? 1 : 0
        });
      }
    });
    
    // Convert to array and sort by date
    return Array.from(weekMap.values())
      .sort((a, b) => a.week.localeCompare(b.week));
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
                    {/* Quarter comparison */}
                    {objectivesStats.hasPreviousData && objectivesStats.percentageDiff !== null && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs">
                        {objectivesStats.percentageDiff > 0 ? (
                          <>
                            <TrendingUp className="h-3.5 w-3.5 text-success" />
                            <span className="text-success font-medium">
                              +{objectivesStats.percentageDiff}% completion rate vs last quarter
                            </span>
                          </>
                        ) : objectivesStats.percentageDiff < 0 ? (
                          <>
                            <TrendingDown className="h-3.5 w-3.5 text-orange-500" />
                            <span className="text-orange-500 font-medium">
                              {objectivesStats.percentageDiff}% completion rate vs last quarter
                            </span>
                          </>
                        ) : (
                          <>
                            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Same completion rate as last quarter
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    {/* Total objectives comparison */}
                    {objectivesStats.hasPreviousData && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        {objectivesStats.total > objectivesStats.prevTotal ? (
                          <span>You set {objectivesStats.total - objectivesStats.prevTotal} more objectives than last quarter</span>
                        ) : objectivesStats.total < objectivesStats.prevTotal ? (
                          <span>You set {objectivesStats.prevTotal - objectivesStats.total} fewer objectives than last quarter</span>
                        ) : (
                          <span>Same number of objectives as last quarter</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Objectives by Goal Breakdown */}
          {objectivesByGoal.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Most Active Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {objectivesByGoal.map((goalData, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1 font-medium">{goalData.goalTitle}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {goalData.completed}/{goalData.total} done
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={goalData.total > 0 ? (goalData.completed / goalData.total) * 100 : 0} 
                        className="h-1.5 flex-1" 
                      />
                      <span className="text-xs text-muted-foreground w-8">
                        {goalData.total > 0 ? Math.round((goalData.completed / goalData.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          
          {/* Weekly Activity Chart */}
          {weeklyBreakdown.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Weekly Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[160px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyBreakdown} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <XAxis 
                        dataKey="weekLabel" 
                        tick={{ fontSize: 10 }} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }} 
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border rounded-md shadow-md px-3 py-2 text-xs">
                                <p className="font-medium">Week of {data.weekLabel}</p>
                                <p className="text-success">{data.completed} completed</p>
                                <p className="text-muted-foreground">{data.total - data.completed} incomplete</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="total" stackId="a" radius={[0, 0, 0, 0]} fill="hsl(var(--muted))" />
                      <Bar dataKey="completed" stackId="b" radius={[4, 4, 0, 0]}>
                        {weeklyBreakdown.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.completed === entry.total && entry.total > 0 ? "hsl(var(--success))" : "hsl(var(--primary))"} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-primary" />
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-muted" />
                    <span>Total</span>
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
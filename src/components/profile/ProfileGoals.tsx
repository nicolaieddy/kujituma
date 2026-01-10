import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Goal, GoalStatus, GoalVisibility } from "@/types/goals";
import { GoalsService } from "@/services/goalsService";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Play, CheckCircle, Target, Calendar, EyeOff, HelpCircle, Eye, Loader2, Users, Trophy, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
// Removed framer-motion AnimatePresence to prevent "Maximum call stack size exceeded" on iOS Safari

interface ProfileGoalsProps {
  userId: string;
  isOwnProfile?: boolean;
  viewerType?: 'owner' | 'friend' | 'public';
  onGoalUpdate?: () => void;
}

const COLUMNS = [
  {
    status: 'not_started' as GoalStatus,
    title: 'Not Started',
    icon: Clock,
    color: 'bg-blue-100 text-blue-800'
  },
  {
    status: 'in_progress' as GoalStatus,
    title: 'In Progress',
    icon: Play,
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    status: 'completed' as GoalStatus,
    title: 'Completed',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800'
  }
];

// Helper to get the year a goal belongs to
const getGoalYear = (goal: Goal): number => {
  // Use completed_at for completed goals, target_date for active, or created_at as fallback
  if (goal.status === 'completed' && goal.completed_at) {
    return new Date(goal.completed_at).getFullYear();
  }
  if (goal.target_date) {
    return new Date(goal.target_date).getFullYear();
  }
  return new Date(goal.created_at).getFullYear();
};

export const ProfileGoals = ({ userId, isOwnProfile = false, viewerType = 'owner', onGoalUpdate }: ProfileGoalsProps) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingGoalId, setTogglingGoalId] = useState<string | null>(null);
  const [previousYearsOpen, setPreviousYearsOpen] = useState(false);
  
  const currentYear = new Date().getFullYear();

  // Determine effective view mode
  const effectiveIsOwner = viewerType === 'owner' || isOwnProfile;
  const showPrivateGoals = viewerType === 'owner' || isOwnProfile;

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        let fetchedGoals: Goal[];
        if (effectiveIsOwner) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id === userId) {
            fetchedGoals = await GoalsService.getGoals();
          } else {
            fetchedGoals = await GoalsService.getVisibleGoals(userId, true);
          }
        } else if (viewerType === 'friend') {
          fetchedGoals = await GoalsService.getVisibleGoals(userId, true);
        } else {
          fetchedGoals = await GoalsService.getVisibleGoals(userId, false);
        }
        setGoals(fetchedGoals);
      } catch (error) {
        console.error('Error fetching goals:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchGoals();
    }
  }, [userId, effectiveIsOwner, viewerType]);

  // Update goal visibility
  const handleVisibilityChange = async (goal: Goal, newVisibility: GoalVisibility) => {
    setTogglingGoalId(goal.id);
    try {
      const updatedGoal = await GoalsService.updateGoal(goal.id, { visibility: newVisibility });
      setGoals(goals.map(g => g.id === goal.id ? updatedGoal : g));
      const visibilityLabels = {
        public: 'public (visible to everyone)',
        friends: 'friends only',
        private: 'private (only you)'
      };
      toast({
        title: "Visibility updated",
        description: `Goal is now ${visibilityLabels[newVisibility]}.`,
      });
      onGoalUpdate?.();
    } catch (error) {
      console.error('Error updating goal visibility:', error);
      toast({
        title: "Error",
        description: "Failed to update goal visibility.",
        variant: "destructive",
      });
    } finally {
      setTogglingGoalId(null);
    }
  };

  // Filter goals based on viewer type (visibility)
  const visibleGoals = useMemo(() => {
    return showPrivateGoals 
      ? goals 
      : goals.filter(goal => goal.visibility === 'public' || (viewerType === 'friend' && goal.visibility === 'friends'));
  }, [goals, showPrivateGoals, viewerType]);

  // Separate current year active goals from previous years
  const currentYearActiveGoals = useMemo(() => {
    return visibleGoals.filter(goal => {
      if (goal.status === 'completed' || goal.status === 'deprioritized') return false;
      const goalYear = getGoalYear(goal);
      return goalYear >= currentYear;
    });
  }, [visibleGoals, currentYear]);

  // Current year completed goals
  const currentYearCompletedGoals = useMemo(() => {
    return visibleGoals.filter(goal => {
      if (goal.status !== 'completed') return false;
      const goalYear = getGoalYear(goal);
      return goalYear === currentYear;
    });
  }, [visibleGoals, currentYear]);

  // Previous years' completed goals grouped by year
  const previousYearsGoals = useMemo(() => {
    const grouped: Record<number, Goal[]> = {};
    visibleGoals.forEach(goal => {
      if (goal.status !== 'completed') return;
      const goalYear = getGoalYear(goal);
      if (goalYear < currentYear) {
        if (!grouped[goalYear]) grouped[goalYear] = [];
        grouped[goalYear].push(goal);
      }
    });
    return grouped;
  }, [visibleGoals, currentYear]);

  const previousYearsCount = useMemo(() => {
    return Object.values(previousYearsGoals).reduce((acc, goals) => acc + goals.length, 0);
  }, [previousYearsGoals]);

  const previousYears = useMemo(() => {
    return Object.keys(previousYearsGoals).map(Number).sort((a, b) => b - a);
  }, [previousYearsGoals]);

  // Count hidden private goals
  const hiddenGoalsCount = goals.filter(goal => goal.visibility !== 'public').length;

  // Goals by status for kanban columns (current year only)
  const goalsByStatus = useMemo(() => ({
    not_started: currentYearActiveGoals.filter(goal => goal.status === 'not_started'),
    in_progress: currentYearActiveGoals.filter(goal => goal.status === 'in_progress'),
    completed: currentYearCompletedGoals,
  }), [currentYearActiveGoals, currentYearCompletedGoals]);

  const getTargetDateDisplay = (goal: Goal) => {
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      return targetDate.toLocaleDateString();
    }
    return goal.timeframe;
  };

  const renderGoalCard = (goal: Goal) => (
    <Card key={goal.id} className="bg-accent border-border hover:bg-accent/80 transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h5 className="text-foreground font-medium text-sm line-clamp-2 flex-1 pr-2">
            {goal.title}
          </h5>
          {showPrivateGoals && (
            <div className="flex items-center gap-1.5 shrink-0">
              {togglingGoalId === goal.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : null}
              <Select
                value={goal.visibility}
                onValueChange={(value: GoalVisibility) => handleVisibilityChange(goal, value)}
                disabled={togglingGoalId === goal.id}
              >
                <SelectTrigger className="h-7 w-[90px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-3 w-3" />
                      Public
                    </div>
                  </SelectItem>
                  <SelectItem value="friends">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      Friends
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-1.5">
                      <EyeOff className="h-3 w-3" />
                      Private
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        {goal.description && (
          <p className="text-muted-foreground text-xs mb-3 line-clamp-2">
            {goal.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Calendar className="h-3 w-3" />
          <span>{getTargetDateDisplay(goal)}</span>
        </div>
        
        {goal.category && (
          <Badge variant="outline" className="mt-2 text-xs">
            {goal.category}
          </Badge>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">Loading goals...</div>
        </CardContent>
      </Card>
    );
  }

  const totalVisibleGoals = currentYearActiveGoals.length + currentYearCompletedGoals.length + previousYearsCount;

  if (totalVisibleGoals === 0) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            {showPrivateGoals ? 'No goals yet' : 'No public goals to show'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Goals
              {/* Removed nested TooltipProvider - using App-level provider to prevent stack overflow on iOS Safari */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="font-medium mb-1">Goal Visibility</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>Public</strong> - Visible to anyone who views your profile.
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>Friends</strong> - Visible only to your friends.
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>Private</strong> - Only visible to you.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use the dropdown on each goal to change visibility, or edit from the Goals page.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            {!showPrivateGoals && hiddenGoalsCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <EyeOff className="h-3.5 w-3.5" />
                <span>{hiddenGoalsCount} private {hiddenGoalsCount === 1 ? 'goal' : 'goals'} hidden</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {COLUMNS.map((column) => {
              const columnGoals = goalsByStatus[column.status];
              const IconComponent = column.icon;
              
              return (
                <div key={column.status} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4 text-foreground" />
                      <h4 className="text-sm font-semibold text-foreground">{column.title}</h4>
                    </div>
                    <Badge className={`${column.color} text-xs`}>
                      {columnGoals.length}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3 min-h-[200px]">
                    {columnGoals.length === 0 ? (
                      <div className="bg-accent border-border border-2 border-dashed rounded-lg p-6 text-center">
                        <IconComponent className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground text-xs">
                          No {column.title.toLowerCase()} goals
                        </p>
                      </div>
                    ) : (
                      columnGoals.map(renderGoalCard)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Previous Years Section */}
      {previousYearsCount > 0 && (
        <div className="border border-muted bg-muted/30 rounded-lg overflow-hidden">
          <button
            onClick={() => setPreviousYearsOpen(!previousYearsOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ChevronRight 
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                  previousYearsOpen ? 'rotate-90' : ''
                }`} 
              />
              <Trophy className="h-4 w-4 text-green-600" />
              <span className="font-medium text-foreground">Previous Years</span>
            </div>
            <Badge className="bg-muted text-muted-foreground text-xs">
              {previousYearsCount}
            </Badge>
          </button>
          
          {/* Use CSS transitions instead of framer-motion to avoid stack overflow on iOS */}
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              previousYearsOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="p-4 pt-0 space-y-4">
              {previousYears.map((year) => (
                <div key={year}>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">{year}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {previousYearsGoals[year].map(renderGoalCard)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Goal, GoalStatus, GoalVisibility } from "@/types/goals";
import { GoalsService } from "@/services/goalsService";
import { Clock, Play, CheckCircle, Target, Calendar, EyeOff, HelpCircle, Eye, Loader2, Users } from "lucide-react";
import { formatRelativeTime } from "@/utils/dateUtils";
import { toast } from "@/hooks/use-toast";

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

export const ProfileGoals = ({ userId, isOwnProfile = false, viewerType = 'owner', onGoalUpdate }: ProfileGoalsProps) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingGoalId, setTogglingGoalId] = useState<string | null>(null);

  // Determine effective view mode
  const effectiveIsOwner = viewerType === 'owner' || isOwnProfile;
  const showPrivateGoals = viewerType === 'owner' || isOwnProfile;

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        // Fetch goals based on viewer type
        let fetchedGoals: Goal[];
        if (effectiveIsOwner) {
          fetchedGoals = await GoalsService.getGoals();
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

    fetchGoals();
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

  // Filter goals based on viewer type
  const visibleGoals = showPrivateGoals 
    ? goals 
    : goals.filter(goal => goal.visibility === 'public' || (viewerType === 'friend' && goal.visibility === 'friends'));

  // Count hidden private goals
  const hiddenGoalsCount = goals.filter(goal => goal.visibility !== 'public').length;

  const goalsByStatus = {
    not_started: visibleGoals.filter(goal => goal.status === 'not_started'),
    in_progress: visibleGoals.filter(goal => goal.status === 'in_progress'),
    completed: visibleGoals.filter(goal => goal.status === 'completed'),
  };

  const getTargetDateDisplay = (goal: Goal) => {
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      return targetDate.toLocaleDateString();
    }
    return goal.timeframe;
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">Loading goals...</div>
        </CardContent>
      </Card>
    );
  }

  if (visibleGoals.length === 0) {
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
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goals
            <TooltipProvider>
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
            </TooltipProvider>
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
                    columnGoals.map((goal) => (
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
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
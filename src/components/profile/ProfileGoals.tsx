import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Goal, GoalStatus } from "@/types/goals";
import { GoalsService } from "@/services/goalsService";
import { Clock, Play, CheckCircle, Target, Calendar, EyeOff, HelpCircle, Eye, Loader2 } from "lucide-react";
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
        // Always fetch all goals if owner, otherwise public only
        const fetchedGoals = effectiveIsOwner 
          ? await GoalsService.getGoals() 
          : await GoalsService.getPublicGoals(userId);
        setGoals(fetchedGoals);
      } catch (error) {
        console.error('Error fetching goals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [userId, effectiveIsOwner]);

  // Toggle goal visibility
  const handleToggleVisibility = async (goal: Goal) => {
    setTogglingGoalId(goal.id);
    try {
      const updatedGoal = await GoalsService.updateGoal(goal.id, { is_public: !goal.is_public });
      setGoals(goals.map(g => g.id === goal.id ? updatedGoal : g));
      toast({
        title: updatedGoal.is_public ? "Goal is now public" : "Goal is now private",
        description: updatedGoal.is_public 
          ? "Anyone who views your profile can see this goal." 
          : "Only you can see this goal.",
      });
      onGoalUpdate?.();
    } catch (error) {
      console.error('Error toggling goal visibility:', error);
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
    : goals.filter(goal => goal.is_public);

  // Count hidden private goals
  const hiddenGoalsCount = goals.filter(goal => !goal.is_public).length;

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
                    <strong>Public goals</strong> are visible to anyone who views your profile.
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>Private goals</strong> are only visible to you.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    To change visibility, edit the goal from your Goals page and toggle the "Make this goal public" option.
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
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {togglingGoalId === goal.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                      ) : (
                                        <>
                                          {goal.is_public ? (
                                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                          ) : (
                                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                                          )}
                                        </>
                                      )}
                                      <Switch
                                        checked={goal.is_public}
                                        onCheckedChange={() => handleToggleVisibility(goal)}
                                        disabled={togglingGoalId === goal.id}
                                        className="scale-75"
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs">
                                      {goal.is_public ? "Public - Click to make private" : "Private - Click to make public"}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
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
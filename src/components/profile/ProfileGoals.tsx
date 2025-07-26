import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Goal, GoalStatus } from "@/types/goals";
import { GoalsService } from "@/services/goalsService";
import { Clock, Play, CheckCircle, Target, Calendar } from "lucide-react";
import { formatRelativeTime } from "@/utils/dateUtils";

interface ProfileGoalsProps {
  userId: string;
  isOwnProfile?: boolean;
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

export const ProfileGoals = ({ userId, isOwnProfile = false }: ProfileGoalsProps) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const fetchedGoals = isOwnProfile 
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
  }, [userId, isOwnProfile]);

  const goalsByStatus = {
    not_started: goals.filter(goal => goal.status === 'not_started'),
    in_progress: goals.filter(goal => goal.status === 'in_progress'),
    completed: goals.filter(goal => goal.status === 'completed'),
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
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="p-8">
          <div className="text-center text-white/60">Loading goals...</div>
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-white/60 py-8">
            {isOwnProfile ? 'No goals yet' : 'No public goals to show'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Target className="h-5 w-5" />
          Goals
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
                    <IconComponent className="h-4 w-4 text-white" />
                    <h4 className="text-sm font-semibold text-white">{column.title}</h4>
                  </div>
                  <Badge className={`${column.color} text-xs`}>
                    {columnGoals.length}
                  </Badge>
                </div>
                
                <div className="space-y-3 min-h-[200px]">
                  {columnGoals.length === 0 ? (
                    <div className="bg-white/5 backdrop-blur-lg border-white/10 border-2 border-dashed rounded-lg p-6 text-center">
                      <IconComponent className="h-6 w-6 text-white/40 mx-auto mb-2" />
                      <p className="text-white/60 text-xs">
                        No {column.title.toLowerCase()} goals
                      </p>
                    </div>
                  ) : (
                    columnGoals.map((goal) => (
                      <Card key={goal.id} className="bg-white/5 backdrop-blur-lg border-white/10 hover:bg-white/10 transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="text-white font-medium text-sm line-clamp-2">
                              {goal.title}
                            </h5>
                            {isOwnProfile && !goal.is_public && (
                              <Badge variant="secondary" className="bg-white/20 text-white/80 text-xs ml-2">
                                Private
                              </Badge>
                            )}
                          </div>
                          
                          {goal.description && (
                            <p className="text-white/70 text-xs mb-3 line-clamp-2">
                              {goal.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 text-white/60 text-xs">
                            <Calendar className="h-3 w-3" />
                            <span>{getTargetDateDisplay(goal)}</span>
                          </div>
                          
                          {goal.category && (
                            <Badge variant="outline" className="mt-2 bg-white/10 border-white/20 text-white/80 text-xs">
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
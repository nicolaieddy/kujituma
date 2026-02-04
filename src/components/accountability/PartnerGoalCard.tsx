import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PartnerGoal } from '@/services/accountabilityService';
import { Target, Calendar, ListChecks } from 'lucide-react';
import { format } from 'date-fns';
import { getCategoryConfig, CustomCategoryIcon } from '@/types/customCategories';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PartnerGoalCardProps {
  goal: PartnerGoal & {
    objectives_count?: number;
    completed_objectives_count?: number;
  };
}

export const PartnerGoalCard = ({ goal }: PartnerGoalCardProps) => {
  const objectivesCount = goal.objectives_count ?? 0;
  const completedObjectivesCount = goal.completed_objectives_count ?? 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'in_progress':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'completed':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTimeframeBadge = (timeframe: string) => {
    const colors: Record<string, string> = {
      'weekly': 'bg-blue-500/10 text-blue-600',
      'monthly': 'bg-purple-500/10 text-purple-600',
      'quarterly': 'bg-orange-500/10 text-orange-600',
      'yearly': 'bg-teal-500/10 text-teal-600',
    };
    return colors[timeframe] || 'bg-muted text-muted-foreground';
  };

  const progressPercentage = objectivesCount > 0 
    ? Math.round((completedObjectivesCount / objectivesCount) * 100) 
    : 0;

  return (
    <Card className="border-border hover:border-primary/20 transition-all hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <div className={`p-2 rounded-lg ${goal.is_recurring ? 'bg-primary/10' : 'bg-muted'}`}>
              <Target className={`h-4 w-4 ${goal.is_recurring ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-semibold text-foreground truncate">{goal.title}</h3>
              <Badge variant="outline" className={getStatusColor(goal.status)}>
                {goal.status.replace('_', ' ')}
              </Badge>
            </div>
            
            {goal.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {goal.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <Badge variant="secondary" className={getTimeframeBadge(goal.timeframe)}>
                {goal.timeframe}
              </Badge>
              
              {goal.category && (() => {
                const categoryConfig = getCategoryConfig(goal.category);
                const IconComponent = categoryConfig?.icon || CustomCategoryIcon;
                return (
                  <span className="flex items-center gap-1">
                    <IconComponent className="h-3 w-3" />
                    {goal.category}
                  </span>
                );
              })()}
              
              {goal.target_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(goal.target_date), 'MMM d, yyyy')}
                </span>
              )}

              {objectivesCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 cursor-help">
                      <ListChecks className="h-3 w-3" />
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {completedObjectivesCount}/{objectivesCount}
                      </Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{completedObjectivesCount} of {objectivesCount} historical objectives completed ({progressPercentage}%)</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

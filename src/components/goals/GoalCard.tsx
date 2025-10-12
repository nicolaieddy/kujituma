
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Calendar, Tag, StickyNote, Edit, Trash2, CheckCircle, Play, Clock, MousePointer } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Goal, GoalStatus } from "@/types/goals";
import { formatRelativeTime } from "@/utils/dateUtils";

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: GoalStatus) => void;
  onClick?: (goal: Goal) => void;
}

const STATUS_CONFIG = {
  not_started: { 
    color: "bg-blue-100 text-blue-800", 
    icon: Clock, 
    label: "Not Started" 
  },
  in_progress: { 
    color: "bg-yellow-100 text-yellow-800", 
    icon: Play, 
    label: "In Progress" 
  },
  completed: { 
    color: "bg-green-100 text-green-800", 
    icon: CheckCircle, 
    label: "Completed" 
  }
};

export const GoalCard = ({ goal, onEdit, onDelete, onStatusChange, onClick }: GoalCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = STATUS_CONFIG[goal.status];
  const IconComponent = config.icon;

  const handleStatusChange = (newStatus: GoalStatus) => {
    if (newStatus !== goal.status) {
      onStatusChange(goal.id, newStatus);
    }
  };

  const getTargetDateDisplay = () => {
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      return targetDate.toLocaleDateString();
    }
    return goal.timeframe;
  };

  return (
    <Card 
      className="border-border hover:border-primary/20 transition-colors cursor-pointer group"
      onClick={() => onClick?.(goal)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <IconComponent className="h-4 w-4 text-primary" />
              <Badge className={`${config.color} text-xs`}>
                {config.label}
              </Badge>
            </div>
            <h3 className="font-semibold text-foreground text-lg leading-tight group-hover:text-primary transition-colors">
              {goal.title}
            </h3>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-primary flex items-center gap-1 mt-1">
              <MousePointer className="h-3 w-3" />
              Click to view details
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(goal); }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {goal.status === 'not_started' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange('in_progress'); }}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Progress
                </DropdownMenuItem>
              )}
              {goal.status === 'in_progress' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange('completed'); }}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </DropdownMenuItem>
              )}
              {goal.status === 'completed' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange('in_progress'); }}>
                  <Play className="h-4 w-4 mr-2" />
                  Reopen
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(goal.id); }}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {goal.description && (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {isExpanded ? goal.description : 
                goal.description.length > 100 ? 
                  `${goal.description.substring(0, 100)}...` : 
                  goal.description
              }
              {goal.description.length > 100 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-primary hover:text-primary/80 ml-1 text-sm"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </p>
          )}
          
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{getTargetDateDisplay()}</span>
            </div>
            
            {goal.category && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span>{goal.category}</span>
              </div>
            )}
            
            {goal.notes && (
              <div className="flex items-center gap-1">
                <StickyNote className="h-3 w-3" />
                <span>Has notes</span>
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t border-border">
            <span>Created {formatRelativeTime(new Date(goal.created_at).getTime())}</span>
            {goal.completed_at && (
              <span>Completed {formatRelativeTime(new Date(goal.completed_at).getTime())}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

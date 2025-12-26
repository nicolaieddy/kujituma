
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MoreHorizontal, Calendar, Tag, StickyNote, Edit, Trash2, CheckCircle, Play, Clock, MousePointer, Archive, RotateCcw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Goal, GoalStatus } from "@/types/goals";
import { formatRelativeTime } from "@/utils/dateUtils";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: GoalStatus) => void;
  onClick?: (goal: Goal) => void;
  onDeprioritize?: (id: string) => void;
  onReprioritize?: (id: string) => void;
  isDeprioritized?: boolean;
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
  },
  deprioritized: {
    color: "bg-gray-100 text-gray-600",
    icon: Archive,
    label: "Deprioritized"
  }
};

export const GoalCard = ({ 
  goal, 
  onEdit, 
  onDelete, 
  onStatusChange, 
  onClick,
  onDeprioritize,
  onReprioritize,
  isDeprioritized = false
}: GoalCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeprioritizeDialog, setShowDeprioritizeDialog] = useState(false);
  const config = STATUS_CONFIG[goal.status] || STATUS_CONFIG.not_started;
  const IconComponent = config.icon;

  const handleStatusChange = (newStatus: GoalStatus) => {
    if (newStatus !== goal.status) {
      onStatusChange(goal.id, newStatus);
    }
  };

  const getDateDisplay = () => {
    // For custom date range with both dates
    if (goal.timeframe === 'Custom Date' && (goal.start_date || goal.target_date)) {
      const startDate = goal.start_date ? new Date(goal.start_date).toLocaleDateString() : null;
      const endDate = goal.target_date ? new Date(goal.target_date).toLocaleDateString() : null;
      
      if (startDate && endDate) {
        return `${startDate} → ${endDate}`;
      } else if (startDate) {
        return `From ${startDate}`;
      } else if (endDate) {
        return `Until ${endDate}`;
      }
    }
    
    // For other timeframes or when no custom dates set
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      return targetDate.toLocaleDateString();
    }
    return goal.timeframe;
  };

  const getTimeElapsedProgress = () => {
    if (goal.timeframe !== 'Custom Date' || !goal.start_date || !goal.target_date) {
      return null;
    }
    
    const startDate = new Date(goal.start_date);
    const endDate = new Date(goal.target_date);
    const now = new Date();
    
    // Set times to start of day for accurate comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = now.getTime() - startDate.getTime();
    
    if (totalDuration <= 0) return null;
    
    // Clamp between 0 and 100
    const percentage = Math.max(0, Math.min(100, (elapsedDuration / totalDuration) * 100));
    
    return {
      percentage: Math.round(percentage),
      isOverdue: now > endDate,
      hasNotStarted: now < startDate
    };
  };

  const timeProgress = getTimeElapsedProgress();

  const handleDeleteConfirm = () => {
    onDelete(goal.id);
    setShowDeleteDialog(false);
  };

  const handleDeprioritizeConfirm = () => {
    onDeprioritize?.(goal.id);
    setShowDeprioritizeDialog(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
      >
        <Card 
          className={cn(
            "border-border hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group",
            isDeprioritized && "opacity-60 bg-muted/30"
          )}
          onClick={() => onClick?.(goal)}
        >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <IconComponent className={cn("h-4 w-4", isDeprioritized ? "text-muted-foreground" : "text-primary")} />
                <Badge className={`${config.color} text-xs`}>
                  {config.label}
                </Badge>
              </div>
              <h3 className={cn(
                "font-semibold text-lg leading-tight group-hover:text-primary transition-colors",
                isDeprioritized ? "text-muted-foreground" : "text-foreground"
              )}>
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
                
                {/* Status change actions */}
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
                
                <DropdownMenuSeparator />
                
                {/* Deprioritize/Reprioritize actions */}
                {goal.status === 'deprioritized' && onReprioritize && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReprioritize(goal.id); }}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Re-prioritize
                  </DropdownMenuItem>
                )}
                {goal.status !== 'deprioritized' && goal.status !== 'completed' && onDeprioritize && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowDeprioritizeDialog(true); }}>
                    <Archive className="h-4 w-4 mr-2" />
                    Deprioritize
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
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
              <p className={cn(
                "text-sm leading-relaxed",
                isDeprioritized ? "text-muted-foreground/70" : "text-muted-foreground"
              )}>
                {isExpanded ? goal.description : 
                  goal.description.length > 100 ? 
                    `${goal.description.substring(0, 100)}...` : 
                    goal.description
                }
                {goal.description.length > 100 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
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
                <span>{getDateDisplay()}</span>
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
            
            {/* Time elapsed progress bar for custom date range */}
            {timeProgress && goal.status !== 'completed' && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">
                    {timeProgress.hasNotStarted 
                      ? "Not started yet" 
                      : timeProgress.isOverdue 
                        ? "Overdue" 
                        : "Time elapsed"}
                  </span>
                  <span className={cn(
                    "font-medium",
                    timeProgress.isOverdue ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {timeProgress.percentage}%
                  </span>
                </div>
                <Progress 
                  value={timeProgress.percentage} 
                  className={cn(
                    "h-1.5",
                    timeProgress.isOverdue && "[&>div]:bg-destructive"
                  )}
                />
              </div>
            )}
            
            <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t border-border">
              <span>Created {formatRelativeTime(new Date(goal.created_at).getTime())}</span>
              {goal.completed_at && (
                <span>Completed {formatRelativeTime(new Date(goal.completed_at).getTime())}</span>
              )}
              {goal.deprioritized_at && (
                <span>Deprioritized {formatRelativeTime(new Date(goal.deprioritized_at).getTime())}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{goal.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deprioritize Confirmation Dialog */}
      <AlertDialog open={showDeprioritizeDialog} onOpenChange={setShowDeprioritizeDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Deprioritize Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deprioritize "{goal.title}"? It will be moved to the deprioritized section and hidden from your active goals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeprioritizeConfirm}>
              Deprioritize
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

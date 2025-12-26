import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MoreHorizontal, Calendar, Tag, StickyNote, Edit, Trash2, CheckCircle, Play, Clock, MousePointer, Archive, RotateCcw, RefreshCw, Pause, PlayCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { startOfWeek, addWeeks, startOfMonth, endOfMonth, isBefore, format, getMonth } from "date-fns";

const getNextScheduledDate = (goal: Goal): string | null => {
  if (!goal.is_recurring) return null;
  
  const frequency = goal.recurrence_frequency || 'weekly';
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  
  switch (frequency) {
    case 'daily':
    case 'weekdays':
    case 'weekly':
      return format(currentWeekStart, 'MMM d');
    
    case 'biweekly': {
      const goalCreatedDate = new Date(goal.created_at);
      const goalCreatedWeekStart = startOfWeek(goalCreatedDate, { weekStartsOn: 1 });
      let nextDate = goalCreatedWeekStart;
      while (isBefore(nextDate, currentWeekStart) || format(nextDate, 'yyyy-MM-dd') < format(currentWeekStart, 'yyyy-MM-dd')) {
        nextDate = addWeeks(nextDate, 2);
      }
      return format(nextDate, 'MMM d');
    }
    
    case 'monthly': {
      let checkMonth = startOfMonth(today);
      let firstWeek = startOfWeek(checkMonth, { weekStartsOn: 1 });
      if (isBefore(firstWeek, checkMonth)) {
        firstWeek = addWeeks(firstWeek, 1);
      }
      if (isBefore(firstWeek, currentWeekStart)) {
        checkMonth = startOfMonth(addWeeks(today, 4));
        firstWeek = startOfWeek(checkMonth, { weekStartsOn: 1 });
        if (isBefore(firstWeek, checkMonth)) {
          firstWeek = addWeeks(firstWeek, 1);
        }
      }
      return format(firstWeek, 'MMM d');
    }
    
    case 'monthly_last_week': {
      let monthEnd = endOfMonth(today);
      let lastWeek = startOfWeek(monthEnd, { weekStartsOn: 1 });
      if (isBefore(lastWeek, currentWeekStart)) {
        monthEnd = endOfMonth(addWeeks(today, 4));
        lastWeek = startOfWeek(monthEnd, { weekStartsOn: 1 });
      }
      return format(lastWeek, 'MMM d');
    }
    
    case 'quarterly': {
      const quarterStartMonths = [0, 3, 6, 9];
      let currentMonth = getMonth(today);
      let nextQuarterMonth = quarterStartMonths.find(m => m >= currentMonth) ?? quarterStartMonths[0];
      let year = today.getFullYear();
      if (nextQuarterMonth < currentMonth) year++;
      
      const quarterStart = new Date(year, nextQuarterMonth, 1);
      let firstWeek = startOfWeek(quarterStart, { weekStartsOn: 1 });
      if (isBefore(firstWeek, quarterStart)) {
        firstWeek = addWeeks(firstWeek, 1);
      }
      if (isBefore(firstWeek, currentWeekStart)) {
        const nextQuarterIdx = (quarterStartMonths.indexOf(nextQuarterMonth) + 1) % 4;
        nextQuarterMonth = quarterStartMonths[nextQuarterIdx];
        if (nextQuarterIdx === 0) year++;
        const nextQuarterStart = new Date(year, nextQuarterMonth, 1);
        firstWeek = startOfWeek(nextQuarterStart, { weekStartsOn: 1 });
        if (isBefore(firstWeek, nextQuarterStart)) {
          firstWeek = addWeeks(firstWeek, 1);
        }
      }
      return format(firstWeek, 'MMM d');
    }
    
    default:
      return format(currentWeekStart, 'MMM d');
  }
};

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: GoalStatus) => void;
  onClick?: (goal: Goal) => void;
  onDeprioritize?: (id: string) => void;
  onReprioritize?: (id: string) => void;
  onPauseToggle?: (id: string, isPaused: boolean) => void;
  isDeprioritized?: boolean;
  currentStreak?: number;
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
  onPauseToggle,
  isDeprioritized = false,
  currentStreak = 0
}: GoalCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeprioritizeDialog, setShowDeprioritizeDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const config = STATUS_CONFIG[goal.status] || STATUS_CONFIG.not_started;
  const IconComponent = config.icon;

  const handleStatusChange = (newStatus: GoalStatus) => {
    if (newStatus !== goal.status) {
      onStatusChange(goal.id, newStatus);
    }
  };

  const getDateDisplay = () => {
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return format(date, 'MMM d, yyyy');
    };
    
    const formatDateShort = (dateStr: string) => {
      const date = new Date(dateStr);
      return format(date, 'MMM d');
    };
    
    // Check if both dates are in the same year
    const sameYear = (start: string, end: string) => {
      return new Date(start).getFullYear() === new Date(end).getFullYear();
    };
    
    // For goals with dates
    if (goal.start_date || goal.target_date) {
      if (goal.start_date && goal.target_date) {
        // Both dates: "Jan 1 → Mar 31, 2025" or "Dec 15, 2024 → Jan 31, 2025"
        if (sameYear(goal.start_date, goal.target_date)) {
          return `${formatDateShort(goal.start_date)} → ${formatDate(goal.target_date)}`;
        } else {
          return `${formatDate(goal.start_date)} → ${formatDate(goal.target_date)}`;
        }
      } else if (goal.start_date) {
        return `From ${formatDate(goal.start_date)}`;
      } else if (goal.target_date) {
        return `Due ${formatDate(goal.target_date)}`;
      }
    }
    
    // Fallback to timeframe
    return goal.timeframe;
  };

  const getTimeElapsedProgress = () => {
    if (!goal.target_date) {
      return null;
    }
    
    const endDate = new Date(goal.target_date);
    const now = new Date();
    
    // Set times to start of day for accurate comparison
    endDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysRemaining < 0;
    
    // Only calculate percentage for custom date ranges with both dates
    if (goal.timeframe === 'Custom Date' && goal.start_date) {
      const startDate = new Date(goal.start_date);
      startDate.setHours(0, 0, 0, 0);
      
      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsedDuration = now.getTime() - startDate.getTime();
      const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (totalDuration > 0) {
        const percentage = Math.max(0, Math.min(100, (elapsedDuration / totalDuration) * 100));
        
        return {
          percentage: Math.round(percentage),
          daysRemaining: now < startDate ? daysUntilStart : daysRemaining,
          isOverdue,
          hasNotStarted: now < startDate,
          hasProgressBar: true
        };
      }
    }
    
    // For goals with only an end date, just show days remaining
    return {
      percentage: 0,
      daysRemaining,
      isOverdue,
      hasNotStarted: false,
      hasProgressBar: false
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

  const handlePauseConfirm = () => {
    onPauseToggle?.(goal.id, true);
    setShowPauseDialog(false);
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
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <IconComponent className={cn("h-4 w-4", isDeprioritized ? "text-muted-foreground" : "text-primary")} />
                <Badge className={`${config.color} text-xs`}>
                  {config.label}
                </Badge>
                {goal.is_recurring && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs gap-1 cursor-help",
                          goal.is_paused 
                            ? "border-amber-500/30 text-amber-600 bg-amber-500/5" 
                            : "border-primary/30 text-primary bg-primary/5"
                        )}
                      >
                        {goal.is_paused ? <Pause className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
                        {goal.is_paused ? 'Paused' : 'Habit'}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {goal.is_paused ? (
                        <p className="text-amber-600">Habit paused - no new objectives will be created</p>
                      ) : (
                        <>
                          <p className="capitalize">{goal.recurrence_frequency?.replace('_', ' ') || 'Weekly'}</p>
                          <p className="text-xs text-muted-foreground">Next: {getNextScheduledDate(goal)}</p>
                        </>
                      )}
                    </TooltipContent>
                  </Tooltip>
                )}
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
                
                {/* Pause/Resume for recurring goals */}
                {goal.is_recurring && onPauseToggle && goal.status !== 'completed' && goal.status !== 'deprioritized' && (
                  goal.is_paused ? (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPauseToggle(goal.id, false); }}>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Resume Habit
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowPauseDialog(true); }}>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Habit
                    </DropdownMenuItem>
                  )
                )}
                
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
            
            {/* Days remaining countdown and progress bar */}
            {timeProgress && goal.status !== 'completed' && (
              <div className="space-y-2">
                {/* Days remaining badge */}
                <div className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                  timeProgress.isOverdue 
                    ? "bg-destructive/10 text-destructive" 
                    : timeProgress.daysRemaining <= 7 
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-primary/10 text-primary"
                )}>
                  <Clock className="h-3 w-3" />
                  {timeProgress.hasNotStarted ? (
                    <span>Starts in {Math.abs(timeProgress.daysRemaining)} day{Math.abs(timeProgress.daysRemaining) !== 1 ? 's' : ''}</span>
                  ) : timeProgress.isOverdue ? (
                    <span>{Math.abs(timeProgress.daysRemaining)} day{Math.abs(timeProgress.daysRemaining) !== 1 ? 's' : ''} overdue</span>
                  ) : timeProgress.daysRemaining === 0 ? (
                    <span>Due today</span>
                  ) : (
                    <span>{timeProgress.daysRemaining} day{timeProgress.daysRemaining !== 1 ? 's' : ''} remaining</span>
                  )}
                </div>
                
                {/* Progress bar only for custom date ranges with both dates */}
                {timeProgress.hasProgressBar && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Time elapsed</span>
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

      {/* Pause Habit Confirmation Dialog */}
      <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Pause className="h-5 w-5 text-amber-500" />
              Pause Habit
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Are you sure you want to pause "{goal.title}"?</p>
              {currentStreak > 0 && (
                <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-md p-3 text-destructive text-sm">
                  <span className="text-2xl font-bold">{currentStreak}</span>
                  <span>week streak will be lost!</span>
                </div>
              )}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-amber-700 dark:text-amber-400 text-sm">
                <strong>Note:</strong> Pausing will end your current streak and no new weekly objectives will be created until you resume.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePauseConfirm}
              className="bg-amber-500 text-white hover:bg-amber-600"
            >
              Pause Habit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

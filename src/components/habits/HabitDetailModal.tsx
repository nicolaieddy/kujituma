import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { 
  Flame, TrendingUp, CheckCircle2, Circle, RefreshCw, 
  Calendar, Edit2, Save, X, Pause, Play, Trash2 
} from "lucide-react";
import { HabitStats } from "@/services/habitStreaksService";
import { RecurrenceFrequency } from "@/types/goals";
import { format, parseISO } from "date-fns";
import { useGoals } from "@/hooks/useGoals";
import { toast } from "@/hooks/use-toast";

interface HabitDetailModalProps {
  habitStats: HabitStats | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' }
];

export const HabitDetailModal = ({ habitStats, isOpen, onClose, onUpdate }: HabitDetailModalProps) => {
  const { updateGoal, togglePauseGoal, deleteGoal } = useGoals();
  const [isEditing, setIsEditing] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [editData, setEditData] = useState({
    recurring_objective_text: '',
    recurrence_frequency: 'weekly' as RecurrenceFrequency
  });

  if (!habitStats) return null;

  const { goal, currentStreak, longestStreak, completionRate, totalWeeks, completedWeeks, weeklyHistory } = habitStats;

  const isPaused = goal.is_paused;
  const isCompleted = goal.status === 'completed';

  const handleStartEdit = () => {
    setEditData({
      recurring_objective_text: goal.recurring_objective_text || '',
      recurrence_frequency: goal.recurrence_frequency || 'weekly'
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateGoal(goal.id, {
        recurring_objective_text: editData.recurring_objective_text || null,
        recurrence_frequency: editData.recurrence_frequency
      });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Habit settings updated successfully!"
      });
      onUpdate?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update habit settings.",
        variant: "destructive"
      });
    }
  };

  const handleResume = () => {
    togglePauseGoal(goal.id, false);
    onUpdate?.();
  };

  const handlePauseConfirm = () => {
    togglePauseGoal(goal.id, true);
    setShowPauseDialog(false);
    onUpdate?.();
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this habit? This cannot be undone.")) {
      try {
        await deleteGoal(goal.id);
        toast({
          title: "Habit Deleted",
          description: "The habit has been removed."
        });
        onClose();
        onUpdate?.();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete habit.",
          variant: "destructive"
        });
      }
    }
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 8) return "text-orange-500";
    if (streak >= 4) return "text-yellow-500";
    if (streak >= 1) return "text-green-500";
    return "text-muted-foreground";
  };

  const frequencyLabel = {
    weekly: "Weekly",
    biweekly: "Bi-weekly",
    monthly: "Monthly"
  }[goal.recurrence_frequency || 'weekly'];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <DialogTitle className="text-xl">{goal.title}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {isPaused && <Badge variant="secondary">Paused</Badge>}
              {isCompleted && <Badge variant="default">Completed</Badge>}
              <Badge variant="outline">{frequencyLabel}</Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-muted/50">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Flame className={`h-5 w-5 ${getStreakColor(currentStreak)}`} />
                    <span className={`font-bold text-2xl ${getStreakColor(currentStreak)}`}>
                      {currentStreak}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Current Streak</p>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <span className="font-bold text-2xl text-blue-500">{longestStreak}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Best Streak</p>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-bold text-2xl text-green-500">{completionRate}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Completion</p>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{completedWeeks} / {totalWeeks} weeks</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>

            {/* Settings Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Settings</h3>
                {!isEditing ? (
                  <Button variant="ghost" size="sm" onClick={handleStartEdit}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit}>
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select
                      value={editData.recurrence_frequency}
                      onValueChange={(value: RecurrenceFrequency) => 
                        setEditData({ ...editData, recurrence_frequency: value })
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="objective_text">Objective Text</Label>
                    <Input
                      id="objective_text"
                      value={editData.recurring_objective_text}
                      onChange={(e) => setEditData({ ...editData, recurring_objective_text: e.target.value })}
                      placeholder={goal.title}
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty to use the goal title
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frequency</span>
                    <span className="font-medium">{frequencyLabel}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Objective Text</span>
                    <span className="font-medium truncate max-w-[200px]">
                      {goal.recurring_objective_text || goal.title}
                    </span>
                  </div>
                  {goal.target_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Target Date</span>
                      <span className="font-medium">
                        {format(parseISO(goal.target_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Weekly History */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Weekly History
              </h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {weeklyHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No history yet. Complete your first week!
                  </p>
                ) : (
                  weeklyHistory.map((week) => (
                    <div 
                      key={week.weekStart}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        week.isCompleted ? 'bg-green-500/10' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {week.isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">
                          Week of {format(parseISO(week.weekStart), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <Badge variant={week.isCompleted ? "default" : "secondary"}>
                        {week.isCompleted ? 'Completed' : 'Missed'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              {!isCompleted && (
                isPaused ? (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleResume}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume Habit
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowPauseDialog(true)}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Habit
                  </Button>
                )
              )}
              <Button 
                variant="destructive" 
                size="icon"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </ScrollArea>

        {/* Pause Confirmation Dialog */}
        <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
          <AlertDialogContent>
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
      </DialogContent>
    </Dialog>
  );
};

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Goal, GoalStatus, HabitItem, RecurrenceFrequency } from "@/types/goals";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { GoalForm } from "./GoalForm";
import { GoalObjectivesList } from "./GoalObjectivesList";
import { HabitCompletionTimeline } from "./HabitCompletionTimeline";
import { Edit, CheckCircle, Play, Clock, Trash2, Plus, Target, RefreshCw, ArrowRight, X } from "lucide-react";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { Link } from "react-router-dom";

interface GoalDetailModalProps {
  goal: Goal | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: GoalStatus) => void;
  weeklyObjectives: WeeklyObjective[];
  onCreateObjective: (goalId: string, text: string, weekStart?: string) => void;
  onUpdateObjective: (id: string, updates: any) => void;
  onDeleteObjective: (id: string) => void;
}

const frequencyLabels: Record<string, string> = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  monthly_last_week: 'Monthly (Last Week)',
  quarterly: 'Quarterly'
};

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
    icon: Clock,
    label: "Deprioritized"
  }
};

export const GoalDetailModal = ({
  goal,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  weeklyObjectives,
  onCreateObjective,
  onUpdateObjective,
  onDeleteObjective,
}: GoalDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [quickAddText, setQuickAddText] = useState("");
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [newHabitText, setNewHabitText] = useState("");
  const [newHabitFrequency, setNewHabitFrequency] = useState<RecurrenceFrequency>("weekly");
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editingHabitText, setEditingHabitText] = useState("");
  const [editingHabitFrequency, setEditingHabitFrequency] = useState<RecurrenceFrequency>("weekly");

  if (!goal) return null;

  const config = STATUS_CONFIG[goal.status];
  const IconComponent = config.icon;
  const relatedObjectives = weeklyObjectives.filter(obj => obj.goal_id === goal.id);
  const habitItems = goal.habit_items || [];

  const handleStatusChange = (newStatus: GoalStatus) => {
    if (newStatus !== goal.status) {
      onStatusChange(goal.id, newStatus);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = (data: any) => {
    onEdit({ ...goal, ...data });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    setIsQuickAdding(false);
    setQuickAddText("");
    setIsAddingHabit(false);
    setNewHabitText("");
    onClose();
  };

  const handleQuickAddObjective = () => {
    if (!quickAddText.trim()) return;
    const currentWeekStart = WeeklyProgressService.getWeekStart();
    onCreateObjective(goal.id, quickAddText.trim(), currentWeekStart);
    setQuickAddText("");
    setIsQuickAdding(false);
  };

  const handleAddHabit = () => {
    if (!newHabitText.trim()) return;
    const newHabit: HabitItem = {
      id: crypto.randomUUID(),
      text: newHabitText.trim(),
      frequency: newHabitFrequency,
    };
    const updatedHabits = [...habitItems, newHabit];
    onEdit({ ...goal, habit_items: updatedHabits });
    setNewHabitText("");
    setNewHabitFrequency("weekly");
    setIsAddingHabit(false);
  };

  const handleRemoveHabit = (habitId: string) => {
    const updatedHabits = habitItems.filter(h => h.id !== habitId);
    onEdit({ ...goal, habit_items: updatedHabits });
  };

  const handleStartEditHabit = (habit: HabitItem) => {
    setEditingHabitId(habit.id);
    setEditingHabitText(habit.text);
    setEditingHabitFrequency(habit.frequency);
  };

  const handleSaveEditHabit = () => {
    if (!editingHabitId || !editingHabitText.trim()) return;
    const updatedHabits = habitItems.map(h => 
      h.id === editingHabitId 
        ? { ...h, text: editingHabitText.trim(), frequency: editingHabitFrequency }
        : h
    );
    onEdit({ ...goal, habit_items: updatedHabits });
    setEditingHabitId(null);
    setEditingHabitText("");
  };

  const handleCancelEditHabit = () => {
    setEditingHabitId(null);
    setEditingHabitText("");
  };
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card shadow-elegant">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <IconComponent className="h-5 w-5 text-primary" />
                <Badge className={`${config.color} text-sm`}>
                  {config.label}
                </Badge>
              </div>
              <DialogTitle className="text-2xl text-foreground">
                {goal.title}
              </DialogTitle>
              {goal.description && (
                <p className="text-muted-foreground mt-2">{goal.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              {!isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  {goal.status === 'not_started' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange('in_progress')}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                  )}
                  {goal.status === 'in_progress' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange('completed')}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(goal.id)}
                    className="text-destructive hover:bg-destructive/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {isEditing ? (
          <div className="mt-6">
            <GoalForm
              key={`edit-${goal.id}`}
              onSubmit={handleSave}
              onCancel={handleCancel}
              initialData={goal}
            />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Quick Add Objective */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
              {isQuickAdding ? (
                <div className="flex items-center gap-2 flex-1">
                  <Target className="h-5 w-5 text-primary flex-shrink-0" />
                  <Input
                    value={quickAddText}
                    onChange={(e) => setQuickAddText(e.target.value)}
                    placeholder="Quick add objective for this week..."
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickAddObjective();
                      } else if (e.key === 'Escape') {
                        setIsQuickAdding(false);
                        setQuickAddText("");
                      }
                    }}
                  />
                  <Button 
                    size="sm" 
                    onClick={handleQuickAddObjective}
                    disabled={!quickAddText.trim()}
                    className="gradient-primary"
                  >
                    Add
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setIsQuickAdding(false);
                      setQuickAddText("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="flex-1 justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsQuickAdding(true)}
                >
                  <Plus className="h-4 w-4" />
                  Quick add objective for this week
                </Button>
              )}
            </div>

            {/* Habits Section - always visible with add capability */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Habits</h3>
                  {habitItems.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {habitItems.length}
                    </Badge>
                  )}
                </div>
                {habitItems.length > 0 && (
                  <Link 
                    to={`/?tab=habits&highlightGoal=${goal.id}`}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                  >
                    Track in Habits
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Recurring behaviors tied to this goal - tracked in the Habits tab
              </p>

              {/* Saved habits list */}
              {habitItems.length > 0 && (
                <div className="space-y-2">
                  {habitItems.map((habit) => (
                    <div 
                      key={habit.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30 group"
                    >
                      {editingHabitId === habit.id ? (
                        // Editing mode
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editingHabitText}
                            onChange={(e) => setEditingHabitText(e.target.value)}
                            className="flex-1 h-8"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveEditHabit();
                              } else if (e.key === 'Escape') {
                                handleCancelEditHabit();
                              }
                            }}
                          />
                          <Select
                            value={editingHabitFrequency}
                            onValueChange={(value: RecurrenceFrequency) => setEditingHabitFrequency(value)}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background border border-border z-50">
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekdays">Weekdays</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="biweekly">Bi-weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            size="sm" 
                            onClick={handleSaveEditHabit}
                            disabled={!editingHabitText.trim()}
                            className="h-8 gradient-primary"
                          >
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={handleCancelEditHabit}
                            className="h-8"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        // Display mode
                        <>
                          <button 
                            onClick={() => handleStartEditHabit(habit)}
                            className="text-foreground text-sm hover:text-primary transition-colors text-left"
                          >
                            {habit.text}
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleStartEditHabit(habit)}
                              className="hover:opacity-80 transition-opacity"
                            >
                              <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/50 text-xs cursor-pointer hover:border-primary/50">
                                {frequencyLabels[habit.frequency] || habit.frequency}
                              </Badge>
                            </button>
                            <Link 
                              to={`/?tab=habits&highlightGoal=${goal.id}`}
                              className="h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary/80"
                              title="Track in Habits tab"
                            >
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveHabit(habit.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new habit */}
              {isAddingHabit ? (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                  <Input
                    value={newHabitText}
                    onChange={(e) => setNewHabitText(e.target.value)}
                    placeholder="What habit do you want to build?"
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddHabit();
                      } else if (e.key === 'Escape') {
                        setIsAddingHabit(false);
                        setNewHabitText("");
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Select
                      value={newHabitFrequency}
                      onValueChange={(value: RecurrenceFrequency) => setNewHabitFrequency(value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekdays">Weekdays</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      size="sm" 
                      onClick={handleAddHabit}
                      disabled={!newHabitText.trim()}
                      className="gradient-primary"
                    >
                      Add Habit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setIsAddingHabit(false);
                        setNewHabitText("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground border border-dashed border-border/50"
                  onClick={() => setIsAddingHabit(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add a habit to track
                </Button>
              )}
            </div>

            {/* Habit Completion Timeline - only show if habits exist */}
            {habitItems.length > 0 && (
              <HabitCompletionTimeline 
                goal={goal} 
                objectives={relatedObjectives} 
              />
            )}
            
            {/* Objectives Section - one-time tasks */}
            <GoalObjectivesList
              goal={goal}
              objectives={relatedObjectives}
              onCreateObjective={onCreateObjective}
              onUpdateObjective={onUpdateObjective}
              onDeleteObjective={onDeleteObjective}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
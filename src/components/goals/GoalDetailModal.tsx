import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Goal, GoalStatus, HabitItem, CustomSchedule } from "@/types/goals";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { GoalForm } from "./GoalForm";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { Edit, CheckCircle, Play, Clock, Trash2, Plus, RefreshCw, Target, CheckCircle2 } from "lucide-react";
import { CustomRecurrencePicker, formatCustomSchedule } from "@/components/habits/CustomRecurrencePicker";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableHabitRow } from "./SortableHabitRow";
import { Checkbox } from "@/components/ui/checkbox";

type HabitFrequency = 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom';

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
  quarterly: 'Quarterly',
  custom: 'Custom'
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
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [newHabitText, setNewHabitText] = useState("");
  const [newHabitFrequency, setNewHabitFrequency] = useState<HabitFrequency>("weekly");
  const [newHabitCustomSchedule, setNewHabitCustomSchedule] = useState<CustomSchedule | undefined>();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editingHabitText, setEditingHabitText] = useState("");
  const [editingHabitFrequency, setEditingHabitFrequency] = useState<HabitFrequency>("weekly");
  const [editingHabitCustomSchedule, setEditingHabitCustomSchedule] = useState<CustomSchedule | undefined>();
  const [showEditCustomPicker, setShowEditCustomPicker] = useState(false);
  
  // Objectives state
  const [newObjectiveText, setNewObjectiveText] = useState("");
  const [newObjectiveWeek, setNewObjectiveWeek] = useState<string>(WeeklyProgressService.getWeekStart());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  if (!goal) return null;

  const config = STATUS_CONFIG[goal.status];
  const IconComponent = config.icon;
  const relatedObjectives = weeklyObjectives.filter(obj => obj.goal_id === goal.id);
  const habitItems = goal.habit_items || [];
  const hasNoContent = habitItems.length === 0 && relatedObjectives.length === 0;

  // Week options for objectives
  const generateWeekOptions = () => {
    const weeks = [];
    const currentDate = new Date();
    for (let i = 4; i >= 1; i--) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - (i * 7));
      weeks.push(WeeklyProgressService.getWeekStart(date));
    }
    for (let i = 0; i <= 8; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + (i * 7));
      weeks.push(WeeklyProgressService.getWeekStart(date));
    }
    return weeks;
  };

  const weekOptions = generateWeekOptions();
  
  const getWeekNumber = (weekStart: string) => {
    const startDate = new Date(weekStart);
    const startOfYear = new Date(startDate.getFullYear(), 0, 1);
    const pastDaysOfYear = (startDate.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  };

  const formatWeekRange = (weekStart: string) => {
    return WeeklyProgressService.formatWeekRange(weekStart);
  };

  const handleStatusChange = (newStatus: GoalStatus) => {
    if (newStatus !== goal.status) {
      onStatusChange(goal.id, newStatus);
    }
  };

  const handleEdit = () => setIsEditing(true);

  const handleSave = (data: any) => {
    onEdit({ ...goal, ...data });
    setIsEditing(false);
  };

  const handleCancel = () => setIsEditing(false);

  const handleClose = () => {
    setIsEditing(false);
    setIsAddingHabit(false);
    setNewHabitText("");
    setNewHabitFrequency("weekly");
    setNewHabitCustomSchedule(undefined);
    setEditingHabitId(null);
    setNewObjectiveText("");
    onClose();
  };

  // Habit handlers
  const handleAddHabit = () => {
    if (!newHabitText.trim()) return;
    const newHabit: HabitItem = {
      id: crypto.randomUUID(),
      text: newHabitText.trim(),
      frequency: newHabitFrequency,
      ...(newHabitFrequency === 'custom' && newHabitCustomSchedule && { customSchedule: newHabitCustomSchedule }),
    };
    onEdit({ ...goal, habit_items: [...habitItems, newHabit] });
    setNewHabitText("");
    setNewHabitFrequency("weekly");
    setNewHabitCustomSchedule(undefined);
    setIsAddingHabit(false);
  };

  const handleRemoveHabit = (habitId: string) => {
    onEdit({ ...goal, habit_items: habitItems.filter(h => h.id !== habitId) });
  };

  const handleStartEditHabit = (habit: HabitItem) => {
    setEditingHabitId(habit.id);
    setEditingHabitText(habit.text);
    setEditingHabitFrequency(habit.frequency as HabitFrequency);
    setEditingHabitCustomSchedule(habit.customSchedule);
  };

  const handleSaveEditHabit = () => {
    if (!editingHabitId || !editingHabitText.trim()) return;
    const updatedHabits = habitItems.map(h => 
      h.id === editingHabitId 
        ? { ...h, text: editingHabitText.trim(), frequency: editingHabitFrequency, customSchedule: editingHabitFrequency === 'custom' ? editingHabitCustomSchedule : undefined }
        : h
    );
    onEdit({ ...goal, habit_items: updatedHabits });
    setEditingHabitId(null);
    setEditingHabitText("");
    setEditingHabitCustomSchedule(undefined);
  };

  const handleCancelEditHabit = () => {
    setEditingHabitId(null);
    setEditingHabitText("");
    setEditingHabitCustomSchedule(undefined);
  };

  const getHabitFrequencyLabel = (habit: HabitItem): string => {
    if (habit.frequency === 'custom' && habit.customSchedule) {
      return formatCustomSchedule(habit.customSchedule);
    }
    return frequencyLabels[habit.frequency] || habit.frequency;
  };

  const handleNewFrequencyChange = (value: HabitFrequency) => {
    setNewHabitFrequency(value);
    if (value === 'custom') setShowCustomPicker(true);
  };

  const handleEditFrequencyChange = (value: HabitFrequency) => {
    setEditingHabitFrequency(value);
    if (value === 'custom') setShowEditCustomPicker(true);
  };

  const handleHabitDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = habitItems.findIndex(item => item.id === active.id);
      const newIndex = habitItems.findIndex(item => item.id === over.id);
      onEdit({ ...goal, habit_items: arrayMove(habitItems, oldIndex, newIndex) });
    }
  };

  // Objective handlers
  const handleCreateObjective = () => {
    if (!newObjectiveText.trim()) return;
    onCreateObjective(goal.id, newObjectiveText.trim(), newObjectiveWeek);
    setNewObjectiveText("");
    setNewObjectiveWeek(WeeklyProgressService.getWeekStart());
  };

  const handleToggleObjective = (objective: WeeklyObjective) => {
    onUpdateObjective(objective.id, { is_completed: !objective.is_completed });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-card shadow-elegant">
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
                  <Button variant="ghost" size="sm" onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  {goal.status === 'not_started' && (
                    <Button variant="ghost" size="sm" onClick={() => handleStatusChange('in_progress')}>
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                  )}
                  {goal.status === 'in_progress' && (
                    <Button variant="ghost" size="sm" onClick={() => handleStatusChange('completed')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => onDelete(goal.id)} className="text-destructive hover:bg-destructive/20">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {isEditing ? (
          <div className="mt-6">
            <GoalForm key={`edit-${goal.id}`} onSubmit={handleSave} onCancel={handleCancel} initialData={goal} />
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            
            {/* Empty state explainer */}
            {hasNoContent && (
              <div className="rounded-lg border-2 border-dashed border-border/50 p-6 text-center">
                <p className="text-muted-foreground mb-2">
                  Track progress on this goal in two ways:
                </p>
                <div className="flex justify-center gap-8 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-primary" />
                    <span><strong>Habits</strong> – recurring behaviors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span><strong>Objectives</strong> – one-time tasks</span>
                  </div>
                </div>
              </div>
            )}

            {/* HABITS SECTION */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Habits</h3>
                {habitItems.length > 0 && (
                  <span className="text-xs text-muted-foreground">({habitItems.length})</span>
                )}
              </div>
              
              {habitItems.length === 0 && !isAddingHabit && (
                <p className="text-sm text-muted-foreground">
                  Add recurring behaviors you want to do regularly for this goal.
                </p>
              )}

              {habitItems.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleHabitDragEnd}>
                  <SortableContext items={habitItems.map(h => h.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {habitItems.map((habit) => (
                        <SortableHabitRow
                          key={habit.id}
                          habit={habit}
                          isEditing={editingHabitId === habit.id}
                          editingText={editingHabitText}
                          editingFrequency={editingHabitFrequency}
                          onEditingTextChange={setEditingHabitText}
                          onEditingFrequencyChange={handleEditFrequencyChange}
                          onStartEdit={handleStartEditHabit}
                          onSaveEdit={handleSaveEditHabit}
                          onCancelEdit={handleCancelEditHabit}
                          onRemove={handleRemoveHabit}
                          getFrequencyLabel={getHabitFrequencyLabel}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {isAddingHabit ? (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                  <Input
                    value={newHabitText}
                    onChange={(e) => setNewHabitText(e.target.value)}
                    placeholder="What habit do you want to build?"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleAddHabit(); }
                      else if (e.key === 'Escape') { setIsAddingHabit(false); setNewHabitText(""); }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Select value={newHabitFrequency} onValueChange={handleNewFrequencyChange}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-[200]">
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekdays">Weekdays</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="custom">Custom...</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleAddHabit} disabled={!newHabitText.trim()} className="gradient-primary">
                      Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setIsAddingHabit(false); setNewHabitText(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setIsAddingHabit(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add habit
                </Button>
              )}
            </section>

            {/* OBJECTIVES SECTION */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Objectives</h3>
                {relatedObjectives.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({relatedObjectives.filter(o => o.is_completed).length}/{relatedObjectives.length} done)
                  </span>
                )}
              </div>
              
              {relatedObjectives.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Add one-time tasks scheduled for specific weeks.
                </p>
              )}

              {/* Existing objectives list */}
              {relatedObjectives.length > 0 && (
                <div className="space-y-2">
                  {relatedObjectives.sort((a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime()).map((objective) => (
                    <div
                      key={objective.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                    >
                      <Checkbox
                        checked={objective.is_completed}
                        onCheckedChange={() => handleToggleObjective(objective)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${objective.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {objective.text}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Week {getWeekNumber(objective.week_start)} • {formatWeekRange(objective.week_start)}
                        </p>
                      </div>
                      {objective.is_completed && (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteObjective(objective.id)}
                        className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-destructive hover:bg-destructive/20"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new objective */}
              <div className="flex items-center gap-2">
                <Input
                  value={newObjectiveText}
                  onChange={(e) => setNewObjectiveText(e.target.value)}
                  placeholder="Add an objective..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreateObjective(); }
                  }}
                />
                <Select value={newObjectiveWeek} onValueChange={setNewObjectiveWeek}>
                  <SelectTrigger className="w-44">
                    <SelectValue>
                      <span className="text-xs">W{getWeekNumber(newObjectiveWeek)}</span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {weekOptions.map((week) => (
                      <SelectItem key={week} value={week}>
                        Week {getWeekNumber(week)} • {formatWeekRange(week)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleCreateObjective} disabled={!newObjectiveText.trim()} className="gradient-primary">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </section>
          </div>
        )}
      </DialogContent>

      <CustomRecurrencePicker
        isOpen={showCustomPicker}
        onClose={() => { setShowCustomPicker(false); if (!newHabitCustomSchedule) setNewHabitFrequency("weekly"); }}
        onSave={(schedule) => setNewHabitCustomSchedule(schedule)}
        initialSchedule={newHabitCustomSchedule}
      />

      <CustomRecurrencePicker
        isOpen={showEditCustomPicker}
        onClose={() => { setShowEditCustomPicker(false); if (!editingHabitCustomSchedule) setEditingHabitFrequency("weekly"); }}
        onSave={(schedule) => setEditingHabitCustomSchedule(schedule)}
        initialSchedule={editingHabitCustomSchedule}
      />
    </Dialog>
  );
};

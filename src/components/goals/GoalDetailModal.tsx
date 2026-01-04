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
import { Edit, CheckCircle, Play, Clock, Trash2, Plus, RefreshCw, Target, X, GripVertical } from "lucide-react";
import { CustomRecurrencePicker, formatCustomSchedule } from "@/components/habits/CustomRecurrencePicker";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

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
  not_started: { color: "bg-blue-100 text-blue-800", icon: Clock, label: "Not Started" },
  in_progress: { color: "bg-yellow-100 text-yellow-800", icon: Play, label: "In Progress" },
  completed: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Completed" },
  deprioritized: { color: "bg-gray-100 text-gray-600", icon: Clock, label: "Deprioritized" }
};

// Sortable habit item component
const SortableHabit = ({ 
  habit, 
  onRemove, 
  getFrequencyLabel 
}: { 
  habit: HabitItem; 
  onRemove: (id: string) => void;
  getFrequencyLabel: (h: HabitItem) => string;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-muted/30 group",
        isDragging && "opacity-50"
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm">{habit.text}</span>
      <Badge variant="outline" className="text-xs shrink-0">{getFrequencyLabel(habit)}</Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(habit.id)}
        className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-destructive hover:bg-destructive/20"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
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
  const [newHabitText, setNewHabitText] = useState("");
  const [newHabitFrequency, setNewHabitFrequency] = useState<HabitFrequency>("weekly");
  const [newHabitCustomSchedule, setNewHabitCustomSchedule] = useState<CustomSchedule | undefined>();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [newObjectiveText, setNewObjectiveText] = useState("");
  const [newObjectiveWeek, setNewObjectiveWeek] = useState<string>(WeeklyProgressService.getWeekStart());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  if (!goal) return null;

  const config = STATUS_CONFIG[goal.status];
  const IconComponent = config.icon;
  const relatedObjectives = weeklyObjectives.filter(obj => obj.goal_id === goal.id);
  const habitItems = goal.habit_items || [];
  
  // Sort objectives: current/future weeks first, then by week descending
  const currentWeekStart = WeeklyProgressService.getWeekStart();
  const sortedObjectives = [...relatedObjectives].sort((a, b) => {
    const aIsCurrent = a.week_start >= currentWeekStart;
    const bIsCurrent = b.week_start >= currentWeekStart;
    if (aIsCurrent && !bIsCurrent) return -1;
    if (!aIsCurrent && bIsCurrent) return 1;
    return new Date(b.week_start).getTime() - new Date(a.week_start).getTime();
  });

  // Week options
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

  const formatWeekRange = (weekStart: string) => WeeklyProgressService.formatWeekRange(weekStart);

  const handleClose = () => {
    setIsEditing(false);
    setNewHabitText("");
    setNewHabitFrequency("weekly");
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
  };

  const handleRemoveHabit = (habitId: string) => {
    onEdit({ ...goal, habit_items: habitItems.filter(h => h.id !== habitId) });
  };

  const getHabitFrequencyLabel = (habit: HabitItem): string => {
    if (habit.frequency === 'custom' && habit.customSchedule) return formatCustomSchedule(habit.customSchedule);
    return frequencyLabels[habit.frequency] || habit.frequency;
  };

  const handleFrequencyChange = (value: HabitFrequency) => {
    setNewHabitFrequency(value);
    if (value === 'custom') setShowCustomPicker(true);
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
  const handleAddObjective = () => {
    if (!newObjectiveText.trim()) return;
    onCreateObjective(goal.id, newObjectiveText.trim(), newObjectiveWeek);
    setNewObjectiveText("");
    setNewObjectiveWeek(WeeklyProgressService.getWeekStart());
  };

  const handleToggleObjective = (objective: WeeklyObjective) => {
    onUpdateObjective(objective.id, { is_completed: !objective.is_completed });
  };

  const isCurrentOrFuture = (weekStart: string) => weekStart >= currentWeekStart;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-card shadow-elegant">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <IconComponent className="h-5 w-5 text-primary" />
                <Badge className={`${config.color} text-sm`}>{config.label}</Badge>
              </div>
              <DialogTitle className="text-2xl text-foreground">{goal.title}</DialogTitle>
              {goal.description && <p className="text-muted-foreground mt-2">{goal.description}</p>}
            </div>
            <div className="flex gap-2">
              {!isEditing && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />Edit
                  </Button>
                  {goal.status === 'not_started' && (
                    <Button variant="ghost" size="sm" onClick={() => onStatusChange(goal.id, 'in_progress')}>
                      <Play className="h-4 w-4 mr-2" />Start
                    </Button>
                  )}
                  {goal.status === 'in_progress' && (
                    <Button variant="ghost" size="sm" onClick={() => onStatusChange(goal.id, 'completed')}>
                      <CheckCircle className="h-4 w-4 mr-2" />Complete
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
            <GoalForm key={`edit-${goal.id}`} onSubmit={(data) => { onEdit({ ...goal, ...data }); setIsEditing(false); }} onCancel={() => setIsEditing(false)} initialData={goal} />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            
            {/* HABITS SECTION */}
            <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                <RefreshCw className="h-4 w-4 text-primary" />
                <h3 className="font-medium text-foreground">Habits</h3>
                <span className="text-xs text-muted-foreground ml-auto">Recurring behaviors</span>
              </div>

              {habitItems.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleHabitDragEnd}>
                  <SortableContext items={habitItems.map(h => h.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {habitItems.map((habit) => (
                        <SortableHabit key={habit.id} habit={habit} onRemove={handleRemoveHabit} getFrequencyLabel={getHabitFrequencyLabel} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {habitItems.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No habits yet. Add behaviors you want to repeat regularly.</p>
              )}

              {/* Add habit inline */}
              <div className="flex items-center gap-2 pt-2">
                <Input
                  value={newHabitText}
                  onChange={(e) => setNewHabitText(e.target.value)}
                  placeholder="Add a habit..."
                  className="flex-1 h-9"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddHabit(); } }}
                />
                <Select value={newHabitFrequency} onValueChange={handleFrequencyChange}>
                  <SelectTrigger className="w-28 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-[200]">
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekdays">Weekdays</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAddHabit} disabled={!newHabitText.trim()} className="h-9 px-3">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* OBJECTIVES SECTION */}
            <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="font-medium text-foreground">Objectives</h3>
                <span className="text-xs text-muted-foreground ml-auto">One-time tasks</span>
              </div>

              {sortedObjectives.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {sortedObjectives.map((objective) => {
                    const isCurrent = isCurrentOrFuture(objective.week_start);
                    return (
                      <div
                        key={objective.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg group transition-colors",
                          isCurrent ? "bg-muted/30" : "bg-muted/10",
                          objective.is_completed && "opacity-60"
                        )}
                      >
                        <Checkbox
                          checked={objective.is_completed}
                          onCheckedChange={() => handleToggleObjective(objective)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm", objective.is_completed && "line-through text-muted-foreground")}>
                            {objective.text}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={isCurrent ? "outline" : "secondary"} className="text-xs">
                            W{getWeekNumber(objective.week_start)}
                          </Badge>
                          {objective.is_completed && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteObjective(objective.id)}
                            className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-destructive hover:bg-destructive/20"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {sortedObjectives.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No objectives yet. Add tasks scheduled for specific weeks.</p>
              )}

              {/* Add objective inline */}
              <div className="flex items-center gap-2 pt-2">
                <Input
                  value={newObjectiveText}
                  onChange={(e) => setNewObjectiveText(e.target.value)}
                  placeholder="Add an objective..."
                  className="flex-1 h-9"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddObjective(); } }}
                />
                <Select value={newObjectiveWeek} onValueChange={setNewObjectiveWeek}>
                  <SelectTrigger className="w-28 h-9">
                    <SelectValue>W{getWeekNumber(newObjectiveWeek)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {weekOptions.map((week) => (
                      <SelectItem key={week} value={week}>
                        W{getWeekNumber(week)} • {formatWeekRange(week)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAddObjective} disabled={!newObjectiveText.trim()} className="h-9 px-3">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

          </div>
        )}
      </DialogContent>

      <CustomRecurrencePicker
        isOpen={showCustomPicker}
        onClose={() => { setShowCustomPicker(false); if (!newHabitCustomSchedule) setNewHabitFrequency("weekly"); }}
        onSave={(schedule) => setNewHabitCustomSchedule(schedule)}
        initialSchedule={newHabitCustomSchedule}
      />
    </Dialog>
  );
};

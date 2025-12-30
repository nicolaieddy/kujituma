import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Goal, GoalStatus, HabitItem, CustomSchedule } from "@/types/goals";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { GoalForm } from "./GoalForm";
import { GoalObjectivesList } from "./GoalObjectivesList";
import { HabitCompletionTimeline } from "./HabitCompletionTimeline";
import { Edit, CheckCircle, Play, Clock, Trash2, Plus, RefreshCw, ArrowRight, X, Pencil, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { CustomRecurrencePicker, formatCustomSchedule } from "@/components/habits/CustomRecurrencePicker";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { SortableHabitRow } from "./SortableHabitRow";

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
    setIsAddingHabit(false);
    setNewHabitText("");
    setNewHabitFrequency("weekly");
    setNewHabitCustomSchedule(undefined);
    setEditingHabitId(null);
    onClose();
  };

  const handleAddHabit = () => {
    if (!newHabitText.trim()) return;
    const newHabit: HabitItem = {
      id: crypto.randomUUID(),
      text: newHabitText.trim(),
      frequency: newHabitFrequency,
      ...(newHabitFrequency === 'custom' && newHabitCustomSchedule && { customSchedule: newHabitCustomSchedule }),
    };
    const updatedHabits = [...habitItems, newHabit];
    onEdit({ ...goal, habit_items: updatedHabits });
    setNewHabitText("");
    setNewHabitFrequency("weekly");
    setNewHabitCustomSchedule(undefined);
    setIsAddingHabit(false);
  };

  const handleRemoveHabit = (habitId: string) => {
    const updatedHabits = habitItems.filter(h => h.id !== habitId);
    onEdit({ ...goal, habit_items: updatedHabits });
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
        ? { 
            ...h, 
            text: editingHabitText.trim(), 
            frequency: editingHabitFrequency,
            customSchedule: editingHabitFrequency === 'custom' ? editingHabitCustomSchedule : undefined
          }
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
    if (value === 'custom') {
      setShowCustomPicker(true);
    }
  };

  const handleEditFrequencyChange = (value: HabitFrequency) => {
    setEditingHabitFrequency(value);
    if (value === 'custom') {
      setShowEditCustomPicker(true);
    }
  };

  const handleHabitDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = habitItems.findIndex(item => item.id === active.id);
      const newIndex = habitItems.findIndex(item => item.id === over.id);
      const reorderedHabits = arrayMove(habitItems, oldIndex, newIndex);
      onEdit({ ...goal, habit_items: reorderedHabits });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );
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
                Recurring behaviors tied to this goal - drag to reorder
              </p>

              {/* Saved habits list with drag and drop */}
              {habitItems.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleHabitDragEnd}
                >
                  <SortableContext
                    items={habitItems.map(h => h.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {habitItems.map((habit) => (
                        <SortableHabitRow
                          key={habit.id}
                          habit={habit}
                          goalId={goal.id}
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
                      onValueChange={(value: HabitFrequency) => handleNewFrequencyChange(value)}
                    >
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

      {/* Custom Recurrence Picker for new habit */}
      <CustomRecurrencePicker
        isOpen={showCustomPicker}
        onClose={() => {
          setShowCustomPicker(false);
          if (!newHabitCustomSchedule) {
            setNewHabitFrequency("weekly");
          }
        }}
        onSave={(schedule) => {
          setNewHabitCustomSchedule(schedule);
        }}
        initialSchedule={newHabitCustomSchedule}
      />

      {/* Custom Recurrence Picker for editing habit */}
      <CustomRecurrencePicker
        isOpen={showEditCustomPicker}
        onClose={() => {
          setShowEditCustomPicker(false);
          if (!editingHabitCustomSchedule) {
            setEditingHabitFrequency("weekly");
          }
        }}
        onSave={(schedule) => {
          setEditingHabitCustomSchedule(schedule);
        }}
        initialSchedule={editingHabitCustomSchedule}
      />
    </Dialog>
  );
};
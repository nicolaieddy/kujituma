import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Goal, HabitItem, CustomSchedule } from "@/types/goals";
import { RefreshCw, CheckCircle, Plus, X, GripVertical, Zap, Link } from "lucide-react";
import { CustomRecurrencePicker, formatCustomSchedule } from "@/components/habits/CustomRecurrencePicker";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { useActivityMappings, STRAVA_ACTIVITY_TYPES } from "@/hooks/useActivityMappings";
import { useStravaConnection } from "@/hooks/useStravaConnection";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type HabitFrequency = 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom';

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

interface GoalDetailHabitsSectionProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
}

// Sortable habit item component
const SortableHabit = ({ 
  habit, 
  onRemove, 
  getFrequencyLabel,
  onEdit,
  stravaMapping,
  isStravaConnected,
  onLinkStrava
}: { 
  habit: HabitItem; 
  onRemove: (id: string) => void;
  getFrequencyLabel: (h: HabitItem) => string;
  onEdit: (habit: HabitItem) => void;
  stravaMapping: { strava_activity_type: string } | undefined;
  isStravaConnected: boolean;
  onLinkStrava: (habit: HabitItem) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/40 group cursor-pointer transition-colors",
        isDragging && "opacity-50"
      )}
      onClick={() => onEdit(habit)}
    >
      <button 
        {...attributes} 
        {...listeners} 
        className="cursor-grab text-muted-foreground hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm">{habit.text}</span>
      
      {stravaMapping ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
              <Zap className="h-3 w-3" />
              <span className="text-xs font-medium">Strava</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Auto-tracked from Strava ({stravaMapping.strava_activity_type})</p>
          </TooltipContent>
        </Tooltip>
      ) : isStravaConnected && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onLinkStrava(habit); }}
          className="h-6 px-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
        >
          <Link className="h-3 w-3 mr-1" />
          Link Strava
        </Button>
      )}
      
      <Badge variant="outline" className="text-xs shrink-0">{getFrequencyLabel(habit)}</Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => { e.stopPropagation(); onRemove(habit.id); }}
        className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-destructive hover:bg-destructive/20"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

export const GoalDetailHabitsSection = ({ goal, onEdit }: GoalDetailHabitsSectionProps) => {
  const { getMappingForHabitItem, createMapping } = useActivityMappings();
  const { isConnected: isStravaConnected } = useStravaConnection();
  const [newHabitText, setNewHabitText] = useState("");
  const [newHabitFrequency, setNewHabitFrequency] = useState<HabitFrequency>("weekly");
  const [newHabitCustomSchedule, setNewHabitCustomSchedule] = useState<CustomSchedule | undefined>();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  
  // Habit editing state
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editingHabitText, setEditingHabitText] = useState("");
  const [editingHabitFrequency, setEditingHabitFrequency] = useState<HabitFrequency>("weekly");

  // Strava mapping dialog state
  const [stravaDialogOpen, setStravaDialogOpen] = useState(false);
  const [stravaHabit, setStravaHabit] = useState<HabitItem | null>(null);
  const [selectedActivityType, setSelectedActivityType] = useState("");
  const [minDuration, setMinDuration] = useState(0);
  const [isLinking, setIsLinking] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const habitItems = goal.habit_items || [];

  const handleOpenStravaDialog = (habit: HabitItem) => {
    setStravaHabit(habit);
    setSelectedActivityType("");
    setMinDuration(0);
    setStravaDialogOpen(true);
  };

  const handleLinkStrava = async () => {
    if (!stravaHabit || !selectedActivityType) return;
    setIsLinking(true);
    await createMapping(selectedActivityType, goal.id, stravaHabit.id, minDuration);
    setIsLinking(false);
    setStravaDialogOpen(false);
    setStravaHabit(null);
  };

  const getHabitFrequencyLabel = (habit: HabitItem): string => {
    if (habit.frequency === 'custom' && habit.customSchedule) return formatCustomSchedule(habit.customSchedule);
    return frequencyLabels[habit.frequency] || habit.frequency;
  };

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

  const handleStartEditHabit = (habit: HabitItem) => {
    setEditingHabitId(habit.id);
    setEditingHabitText(habit.text);
    setEditingHabitFrequency(habit.frequency as HabitFrequency);
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
    setEditingHabitFrequency("weekly");
  };

  const handleCancelEditHabit = () => {
    setEditingHabitId(null);
    setEditingHabitText("");
    setEditingHabitFrequency("weekly");
  };

  const handleFrequencyChange = (value: HabitFrequency) => {
    setNewHabitFrequency(value);
    if (value === 'custom') setShowCustomPicker(true);
  };

  const handleEditHabitFrequencyChange = (value: HabitFrequency) => {
    setEditingHabitFrequency(value);
  };

  const handleHabitDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = habitItems.findIndex(item => item.id === active.id);
      const newIndex = habitItems.findIndex(item => item.id === over.id);
      onEdit({ ...goal, habit_items: arrayMove(habitItems, oldIndex, newIndex) });
    }
  };

  return (
    <>
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
                {habitItems.map((habit) => {
                  const isEditingThis = editingHabitId === habit.id;
                  
                  if (isEditingThis) {
                    return (
                      <div key={habit.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-primary/30">
                        <Input
                          value={editingHabitText}
                          onChange={(e) => setEditingHabitText(e.target.value)}
                          className="flex-1 h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleSaveEditHabit(); }
                            if (e.key === 'Escape') handleCancelEditHabit();
                          }}
                        />
                        <Select value={editingHabitFrequency} onValueChange={handleEditHabitFrequencyChange}>
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border z-[200]">
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekdays">Weekdays</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="ghost" onClick={handleSaveEditHabit} className="h-8 px-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEditHabit} className="h-8 px-2">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  }
                  
                  return (
                    <SortableHabit 
                      key={habit.id} 
                      habit={habit} 
                      onRemove={handleRemoveHabit} 
                      getFrequencyLabel={getHabitFrequencyLabel}
                      onEdit={handleStartEditHabit}
                      stravaMapping={getMappingForHabitItem(habit.id)}
                      isStravaConnected={isStravaConnected}
                      onLinkStrava={handleOpenStravaDialog}
                    />
                  );
                })}
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

      <CustomRecurrencePicker
        isOpen={showCustomPicker}
        onClose={() => { setShowCustomPicker(false); if (!newHabitCustomSchedule) setNewHabitFrequency("weekly"); }}
        onSave={(schedule) => setNewHabitCustomSchedule(schedule)}
        initialSchedule={newHabitCustomSchedule}
      />

      {/* Inline Strava mapping dialog */}
      <Dialog open={stravaDialogOpen} onOpenChange={setStravaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              Link to Strava
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Auto-complete "{stravaHabit?.text}" when you log this activity type in Strava.
            </p>
            
            <div className="space-y-2">
              <Label>Activity Type</Label>
              <Select value={selectedActivityType} onValueChange={setSelectedActivityType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Strava activity..." />
                </SelectTrigger>
                <SelectContent className="bg-background border z-[300]">
                  {STRAVA_ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Minimum Duration (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={minDuration || ""}
                  onChange={(e) => setMinDuration(Number(e.target.value))}
                  placeholder="0"
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Only count activities longer than this duration
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStravaDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleLinkStrava} 
                disabled={!selectedActivityType || isLinking}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isLinking ? "Linking..." : "Link Activity"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

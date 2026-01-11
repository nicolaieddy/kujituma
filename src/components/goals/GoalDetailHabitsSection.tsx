import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Goal, HabitItem, CustomSchedule } from "@/types/goals";
import { RefreshCw, CheckCircle, Plus, X, GripVertical, Zap, Link, Languages, Check } from "lucide-react";
import { CustomRecurrencePicker, formatCustomSchedule } from "@/components/habits/CustomRecurrencePicker";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { useActivityMappings, STRAVA_ACTIVITY_TYPES, DUOLINGO_ACTIVITY_TYPES, IntegrationType, ActivityMapping } from "@/hooks/useActivityMappings";
import { useStravaConnection } from "@/hooks/useStravaConnection";
import { useDuolingoConnection } from "@/hooks/useDuolingoConnection";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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

// Integration types - extensible for future integrations
type HabitIntegrationType = 'strava' | 'duolingo';

interface IntegrationConfig {
  id: HabitIntegrationType;
  name: string;
  icon: typeof Zap;
  color: string;
  bgColor: string;
}

const INTEGRATION_CONFIGS: Record<string, IntegrationConfig> = {
  strava: {
    id: 'strava',
    name: 'Strava',
    icon: Zap,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  duolingo: {
    id: 'duolingo',
    name: 'Duolingo',
    icon: Languages,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
};

// Sortable habit item component
const SortableHabit = ({ 
  habit, 
  onRemove, 
  getFrequencyLabel,
  onEdit,
  linkedMappings,
  availableIntegrations,
  onLinkIntegration
}: { 
  habit: HabitItem; 
  onRemove: (id: string) => void;
  getFrequencyLabel: (h: HabitItem) => string;
  onEdit: (habit: HabitItem) => void;
  linkedMappings: ActivityMapping[];
  availableIntegrations: HabitIntegrationType[];
  onLinkIntegration: (habit: HabitItem) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  // Group mappings by integration type
  const stravaTypes = linkedMappings.filter(m => m.integration_type === 'strava');
  const duolingoTypes = linkedMappings.filter(m => m.integration_type === 'duolingo');
  const hasLinks = linkedMappings.length > 0;

  const getActivityTypeLabel = (mapping: ActivityMapping) => {
    if (mapping.integration_type === 'duolingo') {
      const actType = mapping.strava_activity_type?.replace('duolingo_', '') || '';
      return DUOLINGO_ACTIVITY_TYPES.find(t => t.value === actType)?.label || actType;
    }
    return STRAVA_ACTIVITY_TYPES.find(t => t.value === mapping.strava_activity_type)?.label || mapping.strava_activity_type;
  };

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
      
      {hasLinks ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex items-center gap-1"
              onClick={(e) => { e.stopPropagation(); onLinkIntegration(habit); }}
            >
              {stravaTypes.length > 0 && (
                <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full", INTEGRATION_CONFIGS.strava.bgColor, INTEGRATION_CONFIGS.strava.color)}>
                  <Zap className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    {stravaTypes.length === 1 
                      ? getActivityTypeLabel(stravaTypes[0])
                      : `${stravaTypes.length} types`}
                  </span>
                </div>
              )}
              {duolingoTypes.length > 0 && (
                <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full", INTEGRATION_CONFIGS.duolingo.bgColor, INTEGRATION_CONFIGS.duolingo.color)}>
                  <Languages className="h-3 w-3" />
                  <span className="text-xs font-medium">Duolingo</span>
                </div>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p className="font-medium">Auto-tracked activities:</p>
              {linkedMappings.map((m, i) => (
                <p key={i}>• {getActivityTypeLabel(m)}</p>
              ))}
              <p className="text-muted-foreground mt-1">Click to edit</p>
            </div>
          </TooltipContent>
        </Tooltip>
      ) : availableIntegrations.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onLinkIntegration(habit); }}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link className="h-3 w-3 mr-1" />
          Link
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
  const { getAllMappingsForHabitItem, createMultipleMappings, deleteMapping } = useActivityMappings();
  const { isConnected: isStravaConnected } = useStravaConnection();
  const { isConnected: isDuolingoConnected } = useDuolingoConnection();
  const [newHabitText, setNewHabitText] = useState("");
  const [newHabitFrequency, setNewHabitFrequency] = useState<HabitFrequency>("weekly");
  const [newHabitCustomSchedule, setNewHabitCustomSchedule] = useState<CustomSchedule | undefined>();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  
  // Habit editing state
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editingHabitText, setEditingHabitText] = useState("");
  const [editingHabitFrequency, setEditingHabitFrequency] = useState<HabitFrequency>("weekly");

  // Integration linking dialog state
  const [integrationDialogOpen, setIntegrationDialogOpen] = useState(false);
  const [linkingHabit, setLinkingHabit] = useState<HabitItem | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<HabitIntegrationType | "">("");
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<string[]>([]);
  const [minDuration, setMinDuration] = useState(0);
  const [isLinking, setIsLinking] = useState(false);

  // Determine available integrations
  const availableIntegrations: HabitIntegrationType[] = [];
  if (isStravaConnected) availableIntegrations.push('strava');
  if (isDuolingoConnected) availableIntegrations.push('duolingo');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const habitItems = goal.habit_items || [];

  const handleOpenIntegrationDialog = (habit: HabitItem) => {
    setLinkingHabit(habit);
    // Auto-select if only one integration available
    const defaultIntegration = availableIntegrations.length === 1 ? availableIntegrations[0] : "";
    setSelectedIntegration(defaultIntegration);
    
    // Pre-populate with existing mappings
    const existingMappings = getAllMappingsForHabitItem(habit.id);
    const existingTypes = existingMappings
      .filter(m => (defaultIntegration === '' || m.integration_type === defaultIntegration))
      .map(m => {
        if (m.integration_type === 'duolingo') {
          return m.strava_activity_type?.replace('duolingo_', '') || '';
        }
        return m.strava_activity_type;
      })
      .filter(Boolean);
    
    setSelectedActivityTypes(existingTypes);
    setMinDuration(existingMappings[0]?.min_duration_minutes || 0);
    setIntegrationDialogOpen(true);
  };

  const handleLinkIntegration = async () => {
    if (!linkingHabit || selectedActivityTypes.length === 0 || !selectedIntegration) return;
    setIsLinking(true);
    
    // Get existing mappings to determine what to delete
    const existingMappings = getAllMappingsForHabitItem(linkingHabit.id)
      .filter(m => m.integration_type === selectedIntegration);
    
    const existingTypes = existingMappings.map(m => {
      if (m.integration_type === 'duolingo') {
        return m.strava_activity_type?.replace('duolingo_', '') || '';
      }
      return m.strava_activity_type;
    });
    
    // Delete mappings that are no longer selected
    const toDelete = existingMappings.filter(m => {
      const actType = m.integration_type === 'duolingo' 
        ? m.strava_activity_type?.replace('duolingo_', '') 
        : m.strava_activity_type;
      return !selectedActivityTypes.includes(actType || '');
    });
    
    for (const mapping of toDelete) {
      await deleteMapping(mapping.id);
    }
    
    // Create new mappings for newly selected types
    const newTypes = selectedActivityTypes.filter(t => !existingTypes.includes(t));
    
    if (newTypes.length > 0) {
      await createMultipleMappings(
        newTypes,
        goal.id,
        linkingHabit.id,
        selectedIntegration === 'strava' ? minDuration : 0,
        selectedIntegration as IntegrationType
      );
    }
    
    setIsLinking(false);
    setIntegrationDialogOpen(false);
    setLinkingHabit(null);
    setSelectedActivityTypes([]);
  };

  const toggleActivityType = (activityType: string) => {
    setSelectedActivityTypes(prev => 
      prev.includes(activityType)
        ? prev.filter(t => t !== activityType)
        : [...prev, activityType]
    );
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
                      linkedMappings={getAllMappingsForHabitItem(habit.id)}
                      availableIntegrations={availableIntegrations}
                      onLinkIntegration={handleOpenIntegrationDialog}
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

      {/* Integration linking dialog */}
      <Dialog open={integrationDialogOpen} onOpenChange={setIntegrationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5 text-primary" />
              Link to Integration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Auto-complete "{linkingHabit?.text}" when tracked by an external app.
            </p>

            {/* Integration selector (show if multiple available) */}
            {availableIntegrations.length > 1 && (
              <div className="space-y-2">
                <Label>Integration</Label>
                <Select value={selectedIntegration} onValueChange={(v) => { setSelectedIntegration(v as HabitIntegrationType); setSelectedActivityTypes([]); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select integration..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-[300]">
                    {availableIntegrations.map((integ) => {
                      const config = INTEGRATION_CONFIGS[integ];
                      return (
                        <SelectItem key={integ} value={integ}>
                          <span className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {config.name}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Activity type multi-select - Strava */}
            {selectedIntegration === 'strava' && (
              <div className="space-y-2">
                <Label>Activity Types <span className="text-muted-foreground font-normal">(select multiple)</span></Label>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                  {STRAVA_ACTIVITY_TYPES.map((type) => (
                    <div
                      key={type.value}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors",
                        selectedActivityTypes.includes(type.value)
                          ? "bg-primary/10 text-foreground"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleActivityType(type.value)}
                    >
                      <Checkbox
                        checked={selectedActivityTypes.includes(type.value)}
                        onCheckedChange={() => toggleActivityType(type.value)}
                        className="pointer-events-none"
                      />
                      <span className="text-sm">{type.label}</span>
                    </div>
                  ))}
                </div>
                {selectedActivityTypes.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedActivityTypes.length} type{selectedActivityTypes.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}

            {/* Activity type selector - Duolingo (single select for now) */}
            {selectedIntegration === 'duolingo' && (
              <div className="space-y-2">
                <Label>Activity Type</Label>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                  {DUOLINGO_ACTIVITY_TYPES.map((type) => (
                    <div
                      key={type.value}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors",
                        selectedActivityTypes.includes(type.value)
                          ? "bg-primary/10 text-foreground"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleActivityType(type.value)}
                    >
                      <Checkbox
                        checked={selectedActivityTypes.includes(type.value)}
                        onCheckedChange={() => toggleActivityType(type.value)}
                        className="pointer-events-none"
                      />
                      <span className="text-sm">{type.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duration filter (optional - only for Strava) */}
            {selectedIntegration === 'strava' && (
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
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIntegrationDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleLinkIntegration} 
                disabled={selectedActivityTypes.length === 0 || !selectedIntegration || isLinking}
              >
                {isLinking ? "Saving..." : `Link ${selectedActivityTypes.length || ''} Activity${selectedActivityTypes.length !== 1 ? ' Types' : ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

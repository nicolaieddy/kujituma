import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, Settings2, Zap, X } from "lucide-react";
import { HabitItem, RecurrenceFrequency, CustomSchedule } from "@/types/goals";
import { useIsMobile } from "@/hooks/use-mobile";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { CustomRecurrencePicker, formatCustomSchedule } from "@/components/habits/CustomRecurrencePicker";
import { useActivityMappings, STRAVA_ACTIVITY_TYPES, ActivityMapping } from "@/hooks/useActivityMappings";
import { useStravaConnection } from "@/hooks/useStravaConnection";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface HabitItemsEditorProps {
  habitItems: HabitItem[];
  onChange: (items: HabitItem[]) => void;
  defaultFrequency?: RecurrenceFrequency;
  goalId?: string; // Required for Strava mapping
}

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency | 'custom'; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom...' },
];

// Get display label for a habit item's frequency
const getFrequencyDisplay = (item: HabitItem): string => {
  if (item.frequency === 'custom' && item.customSchedule) {
    return formatCustomSchedule(item.customSchedule);
  }
  const option = FREQUENCY_OPTIONS.find(o => o.value === item.frequency);
  return option?.label || item.frequency;
};

// Strava mapping dialog
interface StravaMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  habitItem: HabitItem | null;
  goalId: string;
  existingMapping: ActivityMapping | null;
}

const StravaMappingDialog = ({ isOpen, onClose, habitItem, goalId, existingMapping }: StravaMappingDialogProps) => {
  const { createMapping, deleteMapping, isSyncing } = useActivityMappings();
  const [selectedActivityType, setSelectedActivityType] = useState(existingMapping?.strava_activity_type || "");
  const [minDuration, setMinDuration] = useState(existingMapping?.min_duration_minutes || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!habitItem || !selectedActivityType) return;
    setIsSubmitting(true);
    await createMapping(selectedActivityType, goalId, habitItem.id, minDuration);
    setIsSubmitting(false);
    onClose();
  };

  const handleRemove = async () => {
    if (!existingMapping) return;
    setIsSubmitting(true);
    await deleteMapping(existingMapping.id);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FC4C02">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Connect to Strava
          </DialogTitle>
          <DialogDescription>
            Automatically track "{habitItem?.text}" when you log a matching activity on Strava.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Strava Activity Type</Label>
            <Select value={selectedActivityType} onValueChange={setSelectedActivityType}>
              <SelectTrigger>
                <SelectValue placeholder="Select activity type..." />
              </SelectTrigger>
              <SelectContent>
                {STRAVA_ACTIVITY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              When you log this activity type on Strava, this habit will be automatically marked complete.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Minimum Duration (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={minDuration}
                onChange={(e) => setMinDuration(parseInt(e.target.value) || 0)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Only count activities longer than this duration. Set to 0 to count all activities.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {existingMapping && (
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={isSubmitting}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Remove Mapping
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!selectedActivityType || isSubmitting || isSyncing}
            className="flex-1"
            style={{ backgroundColor: "#FC4C02" }}
          >
            <Zap className="h-4 w-4 mr-2" />
            {existingMapping ? "Update" : "Connect"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Sortable habit item component
interface SortableHabitItemProps {
  item: HabitItem;
  isMobile: boolean;
  goalId?: string;
  stravaMapping: ActivityMapping | null;
  isStravaConnected: boolean;
  onUpdate: (id: string, updates: Partial<HabitItem>) => void;
  onRemove: (id: string) => void;
  onOpenCustomPicker: (item: HabitItem) => void;
  onOpenStravaPicker: (item: HabitItem) => void;
}

const SortableHabitItem = ({ 
  item, 
  isMobile, 
  goalId,
  stravaMapping,
  isStravaConnected,
  onUpdate, 
  onRemove, 
  onOpenCustomPicker,
  onOpenStravaPicker
}: SortableHabitItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleFrequencyChange = (value: RecurrenceFrequency | 'custom') => {
    if (value === 'custom') {
      onOpenCustomPicker(item);
    } else {
      // Clear custom schedule when switching to a preset frequency
      onUpdate(item.id, { frequency: value, customSchedule: undefined });
    }
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 rounded-lg border bg-background/50 transition-all space-y-2",
        isDragging && "opacity-50 shadow-lg z-50 border-primary/50",
        stravaMapping && "border-[#FC4C02]/30"
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        
        <Input
          value={item.text}
          onChange={(e) => onUpdate(item.id, { text: e.target.value })}
          className={`flex-1 ${isMobile ? 'h-10' : 'h-9'} text-sm`}
          placeholder="Habit text..."
        />
        
        <div className="flex items-center gap-1">
          <Select
            value={item.frequency}
            onValueChange={handleFrequencyChange}
          >
            <SelectTrigger className={`${item.frequency === 'custom' ? 'w-32' : 'w-28'} ${isMobile ? 'h-10' : 'h-9'} text-sm`}>
              <SelectValue>
                {getFrequencyDisplay(item)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="z-[300]">
              {FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Edit custom schedule button */}
          {item.frequency === 'custom' && item.customSchedule && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenCustomPicker(item)}
              title="Edit custom schedule"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Strava connection row */}
      {goalId && isStravaConnected && (
        <TooltipProvider>
          <div className="flex items-center gap-2 pl-7">
            {stravaMapping ? (
              <button
                type="button"
                onClick={() => onOpenStravaPicker(item)}
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-[#FC4C02]/10 text-[#FC4C02] hover:bg-[#FC4C02]/20 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
                <span>
                  {STRAVA_ACTIVITY_TYPES.find(t => t.value === stravaMapping.strava_activity_type)?.label || stravaMapping.strava_activity_type}
                  {stravaMapping.min_duration_minutes > 0 && ` (${stravaMapping.min_duration_minutes}+ min)`}
                </span>
                <Settings2 className="h-3 w-3" />
              </button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onOpenStravaPicker(item)}
                    className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-[#FC4C02]/50 hover:text-[#FC4C02] transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                    </svg>
                    <span>Connect to Strava</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Auto-track this habit from Strava activities</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
};

export const HabitItemsEditor = ({ 
  habitItems, 
  onChange, 
  defaultFrequency = 'daily',
  goalId 
}: HabitItemsEditorProps) => {
  const isMobile = useIsMobile();
  const [newItemText, setNewItemText] = useState("");
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [stravaPickerOpen, setStravaPickerOpen] = useState(false);
  const [stravaEditingHabit, setStravaEditingHabit] = useState<HabitItem | null>(null);

  const { isConnected: isStravaConnected } = useStravaConnection();
  const { getMappingForHabitItem } = useActivityMappings();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const generateId = () => crypto.randomUUID();

  const addHabitItem = () => {
    if (!newItemText.trim()) return;
    
    const newItem: HabitItem = {
      id: generateId(),
      text: newItemText.trim(),
      frequency: defaultFrequency,
    };
    
    onChange([...habitItems, newItem]);
    setNewItemText("");
  };

  const removeHabitItem = (id: string) => {
    onChange(habitItems.filter(item => item.id !== id));
  };

  const updateHabitItem = (id: string, updates: Partial<HabitItem>) => {
    onChange(habitItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const handleOpenCustomPicker = (item: HabitItem) => {
    setEditingHabitId(item.id);
    setCustomPickerOpen(true);
  };

  const handleSaveCustomSchedule = (schedule: CustomSchedule) => {
    if (editingHabitId) {
      updateHabitItem(editingHabitId, { 
        frequency: 'custom', 
        customSchedule: schedule 
      });
    }
    setEditingHabitId(null);
  };

  const handleOpenStravaPicker = (item: HabitItem) => {
    setStravaEditingHabit(item);
    setStravaPickerOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = habitItems.findIndex(item => item.id === active.id);
      const newIndex = habitItems.findIndex(item => item.id === over.id);
      onChange(arrayMove(habitItems, oldIndex, newIndex));
    }
  };

  // Get the current editing habit's custom schedule for the picker
  const editingHabit = editingHabitId ? habitItems.find(h => h.id === editingHabitId) : null;

  return (
    <div className="space-y-3">
      <Label className="font-medium text-sm">Habits</Label>
      <p className="text-xs text-muted-foreground -mt-1">
        Define recurring behaviors to practice. Drag to reorder.
      </p>
      
      {/* Existing Items with Drag and Drop */}
      {habitItems.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={habitItems.map(item => item.id)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {habitItems.map((item) => (
                <SortableHabitItem
                  key={item.id}
                  item={item}
                  isMobile={isMobile}
                  goalId={goalId}
                  stravaMapping={getMappingForHabitItem(item.id) || null}
                  isStravaConnected={isStravaConnected}
                  onUpdate={updateHabitItem}
                  onRemove={removeHabitItem}
                  onOpenCustomPicker={handleOpenCustomPicker}
                  onOpenStravaPicker={handleOpenStravaPicker}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      
      {/* Add New Item */}
      <div className="flex items-center gap-2">
        <Input
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Add a habit (e.g., 'Meditate for 10 minutes')..."
          className={`flex-1 ${isMobile ? 'h-12 text-base' : 'h-10'}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addHabitItem();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={`${isMobile ? 'h-12 w-12' : 'h-10 w-10'}`}
          onClick={addHabitItem}
          disabled={!newItemText.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {habitItems.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No habits added yet. Add habits to track recurring behaviors.
        </p>
      )}

      {/* Custom Recurrence Picker Dialog */}
      <CustomRecurrencePicker
        isOpen={customPickerOpen}
        onClose={() => {
          setCustomPickerOpen(false);
          setEditingHabitId(null);
        }}
        onSave={handleSaveCustomSchedule}
        initialSchedule={editingHabit?.customSchedule}
      />

      {/* Strava Mapping Dialog */}
      {goalId && (
        <StravaMappingDialog
          isOpen={stravaPickerOpen}
          onClose={() => {
            setStravaPickerOpen(false);
            setStravaEditingHabit(null);
          }}
          habitItem={stravaEditingHabit}
          goalId={goalId}
          existingMapping={stravaEditingHabit ? getMappingForHabitItem(stravaEditingHabit.id) || null : null}
        />
      )}
    </div>
  );
};

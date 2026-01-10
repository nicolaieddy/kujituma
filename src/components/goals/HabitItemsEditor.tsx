import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, Settings2 } from "lucide-react";
import { HabitItem, RecurrenceFrequency, CustomSchedule } from "@/types/goals";
import { useIsMobile } from "@/hooks/use-mobile";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { CustomRecurrencePicker, formatCustomSchedule } from "@/components/habits/CustomRecurrencePicker";

interface HabitItemsEditorProps {
  habitItems: HabitItem[];
  onChange: (items: HabitItem[]) => void;
  defaultFrequency?: RecurrenceFrequency;
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

// Sortable habit item component
interface SortableHabitItemProps {
  item: HabitItem;
  isMobile: boolean;
  onUpdate: (id: string, updates: Partial<HabitItem>) => void;
  onRemove: (id: string) => void;
  onOpenCustomPicker: (item: HabitItem) => void;
}

const SortableHabitItem = ({ item, isMobile, onUpdate, onRemove, onOpenCustomPicker }: SortableHabitItemProps) => {
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
        "flex items-center gap-2 p-3 rounded-lg border bg-background/50 transition-all",
        isDragging && "opacity-50 shadow-lg z-50 border-primary/50"
      )}
    >
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
  );
};

export const HabitItemsEditor = ({ 
  habitItems, 
  onChange, 
  defaultFrequency = 'daily' 
}: HabitItemsEditorProps) => {
  const isMobile = useIsMobile();
  const [newItemText, setNewItemText] = useState("");
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);

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
                  onUpdate={updateHabitItem}
                  onRemove={removeHabitItem}
                  onOpenCustomPicker={handleOpenCustomPicker}
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
    </div>
  );
};

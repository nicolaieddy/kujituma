import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { HabitItem, RecurrenceFrequency } from "@/types/goals";
import { useIsMobile } from "@/hooks/use-mobile";

interface HabitItemsEditorProps {
  habitItems: HabitItem[];
  onChange: (items: HabitItem[]) => void;
  defaultFrequency?: RecurrenceFrequency;
}

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
];

export const HabitItemsEditor = ({ 
  habitItems, 
  onChange, 
  defaultFrequency = 'daily' 
}: HabitItemsEditorProps) => {
  const isMobile = useIsMobile();
  const [newItemText, setNewItemText] = useState("");

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

  return (
    <div className="space-y-3">
      <Label className="font-medium text-sm">Habits</Label>
      <p className="text-xs text-muted-foreground -mt-1">
        Define recurring behaviors to practice. Track them in the Habits tab.
      </p>
      
      {/* Existing Items */}
      {habitItems.length > 0 && (
        <div className="space-y-2">
          {habitItems.map((item) => (
            <div 
              key={item.id}
              className="flex items-center gap-2 p-3 rounded-lg border bg-background/50"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              
              <Input
                value={item.text}
                onChange={(e) => updateHabitItem(item.id, { text: e.target.value })}
                className={`flex-1 ${isMobile ? 'h-10' : 'h-9'} text-sm`}
                placeholder="Habit text..."
              />
              
              <Select
                value={item.frequency}
                onValueChange={(value: RecurrenceFrequency) => 
                  updateHabitItem(item.id, { frequency: value })
                }
              >
                <SelectTrigger className={`w-28 ${isMobile ? 'h-10' : 'h-9'} text-sm`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[300]">
                  {FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeHabitItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
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
    </div>
  );
};

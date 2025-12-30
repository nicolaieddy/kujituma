import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, Pencil, ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { HabitItem } from "@/types/goals";
import { cn } from "@/lib/utils";

type HabitFrequency = 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom';

interface SortableHabitRowProps {
  habit: HabitItem;
  isEditing: boolean;
  editingText: string;
  editingFrequency: HabitFrequency;
  onEditingTextChange: (text: string) => void;
  onEditingFrequencyChange: (freq: HabitFrequency) => void;
  onStartEdit: (habit: HabitItem) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onRemove: (id: string) => void;
  getFrequencyLabel: (habit: HabitItem) => string;
}

export const SortableHabitRow = ({
  habit,
  isEditing,
  editingText,
  editingFrequency,
  onEditingTextChange,
  onEditingFrequencyChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onRemove,
  getFrequencyLabel,
}: SortableHabitRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30 group transition-all",
        isDragging && "opacity-50 shadow-lg z-50 border-primary/50"
      )}
    >
      {isEditing ? (
        // Editing mode
        <div className="flex items-center gap-2 flex-1">
          <Input
            value={editingText}
            onChange={(e) => onEditingTextChange(e.target.value)}
            className="flex-1 h-8"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSaveEdit();
              } else if (e.key === 'Escape') {
                onCancelEdit();
              }
            }}
          />
          <Select
            value={editingFrequency}
            onValueChange={(value: HabitFrequency) => onEditingFrequencyChange(value)}
          >
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
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
            onClick={onSaveEdit}
            disabled={!editingText.trim()}
            className="h-8 gradient-primary"
          >
            Save
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onCancelEdit}
            className="h-8"
          >
            Cancel
          </Button>
        </div>
      ) : (
        // Display mode with drag handle
        <>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground transition-colors touch-none"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <button 
              onClick={() => onStartEdit(habit)}
              className="flex items-center gap-2 text-foreground text-sm hover:text-primary transition-colors text-left group/edit truncate"
            >
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 group-hover/edit:opacity-100 transition-opacity text-muted-foreground flex-shrink-0" />
              <span className="truncate">{habit.text}</span>
            </button>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onStartEdit(habit)}
              className="hover:opacity-80 transition-opacity"
            >
              <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/50 text-xs cursor-pointer hover:border-primary/50">
                {getFrequencyLabel(habit)}
              </Badge>
            </button>
            <Link 
              to="/analytics"
              className="h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary/80"
              title="View habit analytics"
            >
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onRemove(habit.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
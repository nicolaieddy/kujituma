import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useObjectiveAutoSave } from "@/hooks/useObjectiveAutoSave";

interface InlineAddObjectiveProps {
  onAddObjective: (text: string, goalId?: string) => Promise<void>;
  isWeekCompleted: boolean;
}

export const InlineAddObjective = ({ onAddObjective, isWeekCompleted }: InlineAddObjectiveProps) => {
  const objectiveSave = useObjectiveAutoSave({
    onSave: (text: string) => onAddObjective(text),
  });

  if (isWeekCompleted) {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="space-y-3 border-t border-border pt-3"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <Checkbox 
          disabled 
          className="border-border opacity-50"
        />
        <Input
          value={objectiveSave.value}
          onChange={(e) => objectiveSave.setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && objectiveSave.value.trim()) {
              e.preventDefault();
              objectiveSave.saveObjective();
            }
          }}
          className="flex-1"
          placeholder="Add a new objective..."
        />
        {objectiveSave.value.trim() && (
          <Button
            size="sm"
            onClick={objectiveSave.saveObjective}
            disabled={objectiveSave.isSaving}
            className="shrink-0"
          >
            {objectiveSave.isSaving ? (
              <div className="w-4 h-4 border border-background border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="hidden sm:inline ml-1">Add</span>
          </Button>
        )}
        {objectiveSave.hasUnsavedChanges && objectiveSave.value.trim() && (
          <span className="text-xs text-muted-foreground hidden sm:inline">Press Enter to save</span>
        )}
      </div>
    </motion.div>
  );
};

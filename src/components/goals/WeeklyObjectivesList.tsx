
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Plus, X, Target, Edit2, Check, RotateCcw, Trash2, Pencil, ArrowRight } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { Goal } from "@/types/goals";
import { useObjectiveAutoSave } from "@/hooks/useObjectiveAutoSave";
import { AutoSaveIndicator } from "@/components/thisweek/AutoSaveIndicator";
import { motion, AnimatePresence } from "framer-motion";
import { celebrateSuccess } from "@/utils/confetti";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableObjectiveItem } from "./SortableObjectiveItem";
import { useEffect } from "react";

import { ObjectiveTimeBlocker } from "@/components/habits/ObjectiveTimeBlocker";

interface WeeklyObjectivesListProps {
  objectives: WeeklyObjective[];
  goals: Goal[];
  isWeekCompleted: boolean;
  isCreating: boolean;
  onToggleObjective: (id: string, isCompleted: boolean) => void;
  onUpdateObjectiveText: (id: string, text: string) => void;
  onUpdateObjectiveGoal: (id: string, goalId: string | null) => void;
  onDeleteObjective: (id: string) => void;
  onDeleteAllObjectives: () => void;
  onAddObjective: (text: string, goalId?: string) => Promise<void>;
  onOpenCarryOver?: () => void;
  hasIncompleteObjectives?: boolean;
  isDeletingAll?: boolean;
  onReorderObjective?: (objectiveId: string, newOrderIndex: number) => void;
  onUpdateObjectiveSchedule?: (id: string, day: string | null, time: string | null) => void;
  currentWeekStart?: string;
  onMoveObjectiveToWeek?: (objectiveId: string, newWeekStart: string) => void;
}

export const WeeklyObjectivesList = ({
  objectives,
  goals,
  isWeekCompleted,
  isCreating,
  onToggleObjective,
  onUpdateObjectiveText,
  onUpdateObjectiveGoal,
  onDeleteObjective,
  onDeleteAllObjectives,
  onAddObjective,
  onOpenCarryOver,
  hasIncompleteObjectives = false,
  isDeletingAll = false,
  onReorderObjective,
  onUpdateObjectiveSchedule,
  currentWeekStart = '',
  onMoveObjectiveToWeek,
}: WeeklyObjectivesListProps) => {
  const navigate = useNavigate();
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [savingObjectiveIds, setSavingObjectiveIds] = useState<Set<string>>(new Set());
  const [localObjectives, setLocalObjectives] = useState(objectives);

  useEffect(() => {
    setLocalObjectives(objectives);
  }, [objectives]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = localObjectives.findIndex((obj) => obj.id === active.id);
    const newIndex = localObjectives.findIndex((obj) => obj.id === over.id);

    if (oldIndex !== newIndex) {
      const newObjectives = arrayMove(localObjectives, oldIndex, newIndex);
      setLocalObjectives(newObjectives);

      // Update order index
      if (onReorderObjective) {
        onReorderObjective(active.id as string, newIndex);
      }
    }
  };

  const handleCreateNewGoal = () => {
    navigate('/goals');
  };

  // Group goals by status
  const groupedGoals = {
    in_progress: goals.filter(goal => goal.status === 'in_progress'),
    not_started: goals.filter(goal => goal.status === 'not_started'),
    completed: goals.filter(goal => goal.status === 'completed'),
  };

  // Auto-save hook for new objectives
  const autoSave = useObjectiveAutoSave({
    onSave: (text: string) => onAddObjective(text),
    delay: 2000,
  });

  // Helper function to get goal name by ID
  const getGoalName = (goalId: string | null) => {
    if (!goalId || !goals) return null;
    const goal = goals.find(g => g.id === goalId);
    return goal?.title || null;
  };

  // Don't render if goals are not loaded yet
  if (!goals) {
    return <div className="text-muted-foreground">Loading objectives...</div>;
  }

  const handleEditObjective = (objective: WeeklyObjective) => {
    setEditingObjectiveId(objective.id);
    setEditingText(objective.text);
  };

  const handleSaveEdit = async (objectiveId: string) => {
    if (editingText.trim()) {
      setSavingObjectiveIds(prev => new Set(prev).add(objectiveId));
      try {
        await onUpdateObjectiveText(objectiveId, editingText.trim());
      } finally {
        setSavingObjectiveIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(objectiveId);
          return newSet;
        });
      }
    }
    setEditingObjectiveId(null);
    setEditingText("");
  };

  const handleCancelEdit = () => {
    setEditingObjectiveId(null);
    setEditingText("");
  };

  const handleGoalChange = async (objectiveId: string, goalId: string) => {
    const goalIdToSave = goalId === "none" ? null : goalId;
    setSavingObjectiveIds(prev => new Set(prev).add(objectiveId));
    try {
      await onUpdateObjectiveGoal(objectiveId, goalIdToSave);
    } finally {
      setSavingObjectiveIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(objectiveId);
        return newSet;
      });
    }
    setEditingGoalId(null); // Close goal editor after change
  };

  const handleEditGoal = (objectiveId: string, currentGoalId: string | null) => {
    setEditingGoalId(objectiveId);
  };

  return (
    <div>
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <Label className="text-foreground font-medium text-base sm:text-lg flex items-center gap-2">
          🎯 This Week's Objectives
          {isWeekCompleted && <span className="text-xs text-muted-foreground">🔒 Locked</span>}
        </Label>
        {!isWeekCompleted && hasIncompleteObjectives && onOpenCarryOver && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCarryOver}
            className="text-xs w-full sm:w-auto"
          >
            <ArrowRight className="h-3 w-3 mr-1" />
            <span className="sm:inline">Carry Over</span>
            <span className="hidden sm:inline"> From Previous Weeks</span>
          </Button>
        )}
      </div>
      
      {/* Empty state with helpful description */}
      {objectives.length === 0 && (
        <div className="bg-accent rounded-lg p-6 border border-border mb-6">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h3 className="text-foreground font-semibold text-lg">
                Plan Your Week for Success
              </h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Use your weekly plan to list your top priorities for the week. Focus on what matters most and make meaningful progress.
              </p>
            </div>
            <p className="text-muted-foreground text-xs">
              Start by adding your first objective below ⬇️
            </p>
          </div>
        </div>
      )}
      
      <div className="mt-3 space-y-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={localObjectives.map(obj => obj.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence mode="popLayout">
              {localObjectives.map((objective, index) => {
                const goalName = getGoalName(objective.goal_id);
                const isEditing = editingObjectiveId === objective.id;
                
                return (
                  <SortableObjectiveItem key={objective.id} id={objective.id}>
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="space-y-2"
                    >
                      <div className="flex items-start sm:items-center gap-2 sm:gap-3 group">
                <div className="relative mt-0.5 sm:mt-0 flex-shrink-0">
                  <Checkbox
                    checked={objective.is_completed}
                    onCheckedChange={(checked) => {
                      onToggleObjective(objective.id, objective.is_completed);
                      if (checked) {
                        celebrateSuccess();
                      }
                    }}
                    disabled={isWeekCompleted}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
                  />
                  {objective.is_completed && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-full h-full bg-primary rounded-full opacity-75"
                      />
                    </motion.div>
                  )}
                </div>
                
                 {isEditing ? (
                   <Input
                     value={editingText}
                     onChange={(e) => setEditingText(e.target.value)}
                     onKeyPress={(e) => {
                       if (e.key === 'Enter') {
                         handleSaveEdit(objective.id);
                       } else if (e.key === 'Escape') {
                         handleCancelEdit();
                       }
                     }}
                     className="flex-1"
                     placeholder="Enter an objective..."
                     autoFocus
                   />
                 ) : (
                   <div className={`flex-1 px-1 sm:px-2 py-1 transition-all duration-300 text-foreground min-w-0`}>
                     <div className="flex flex-wrap items-start sm:items-center gap-1 sm:gap-2">
                       <span className={`text-sm sm:text-base break-words ${
                         objective.is_completed 
                           ? 'line-through decoration-2 decoration-muted-foreground' 
                           : ''
                       } transition-all duration-300`}>
                         {objective.text}
                       </span>
                       {objective.is_completed && (
                         <span className="text-primary font-medium">
                           ✨ Complete!
                         </span>
                       )}
                       {/* Show goal inline with pencil edit - truncate on mobile */}
                       {goalName && (
                         <div className="flex items-center gap-1 ml-1 sm:ml-2 max-w-[100px] sm:max-w-none">
                           <Target className="h-3 w-3 text-muted-foreground flex-shrink-0 hidden sm:block" />
                           <span className="text-xs text-muted-foreground truncate">→ {goalName}</span>
                           {!isWeekCompleted && (
                             <Button
                               type="button"
                               variant="ghost"
                               size="sm"
                               onClick={() => handleEditGoal(objective.id, objective.goal_id)}
                               className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground hover:bg-accent flex-shrink-0 hidden sm:flex"
                             >
                               <Pencil className="h-3 w-3" />
                             </Button>
                           )}
                         </div>
                       )}
                        {/* Show goal selector inline when editing */}
                        {editingGoalId === objective.id && !isWeekCompleted && (
                          <div className="ml-2">
                            <Select 
                              value={objective.goal_id || "none"} 
                              onValueChange={(value) => handleGoalChange(objective.id, value)}
                              onOpenChange={(open) => !open && setEditingGoalId(null)}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select a goal" />
                              </SelectTrigger>
                              <SelectContent className="z-[300]">
                                <SelectItem value="none">
                                  <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4" />
                                    <span>No goal</span>
                                  </div>
                                </SelectItem>
                                {goals.length === 0 ? (
                                  <SelectItem value="create-new" onSelect={handleCreateNewGoal}>
                                    <div className="flex items-center gap-2 text-primary">
                                      <Plus className="h-4 w-4" />
                                      <span>Create your first goal</span>
                                    </div>
                                  </SelectItem>
                                ) : (
                                  <>
                                    {groupedGoals.in_progress.length > 0 && (
                                      <SelectGroup>
                                        <SelectLabel className="text-muted-foreground font-medium">In Progress</SelectLabel>
                                        {groupedGoals.in_progress.map((goal) => (
                                          <SelectItem key={goal.id} value={goal.id} className="pl-6">
                                            {goal.title}
                                          </SelectItem>
                                        ))}
                                      </SelectGroup>
                                    )}
                                    {groupedGoals.not_started.length > 0 && (
                                      <SelectGroup>
                                        <SelectLabel className="text-muted-foreground font-medium">Not Started</SelectLabel>
                                        {groupedGoals.not_started.map((goal) => (
                                          <SelectItem key={goal.id} value={goal.id} className="pl-6">
                                            {goal.title}
                                          </SelectItem>
                                        ))}
                                      </SelectGroup>
                                    )}
                                    {groupedGoals.completed.length > 0 && (
                                      <SelectGroup>
                                        <SelectLabel className="text-muted-foreground font-medium">Completed</SelectLabel>
                                        {groupedGoals.completed.map((goal) => (
                                          <SelectItem key={goal.id} value={goal.id} className="pl-6">
                                            {goal.title}
                                          </SelectItem>
                                        ))}
                                      </SelectGroup>
                                    )}
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {/* Add goal button when no goal is linked - hidden on mobile */}
                        {!goalName && !isWeekCompleted && editingGoalId !== objective.id && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditGoal(objective.id, objective.goal_id)}
                            className="hidden sm:flex h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent ml-2"
                          >
                            <Target className="h-3 w-3 mr-1" />
                            Link goal
                          </Button>
                        )}
                        {/* Time blocker - hidden on mobile */}
                        {!isWeekCompleted && onUpdateObjectiveSchedule && currentWeekStart && (
                          <div className="hidden sm:block">
                            <ObjectiveTimeBlocker
                              scheduledDay={objective.scheduled_day}
                              scheduledTime={objective.scheduled_time}
                              onUpdate={(day, time) => onUpdateObjectiveSchedule(objective.id, day, time)}
                              disabled={isWeekCompleted}
                              currentWeekStart={currentWeekStart}
                              onMoveToWeek={onMoveObjectiveToWeek ? (newWeekStart) => onMoveObjectiveToWeek(objective.id, newWeekStart) : undefined}
                              allObjectives={localObjectives}
                            />
                          </div>
                        )}
                        {/* Show saving indicator */}
                        {savingObjectiveIds.has(objective.id) && (
                          <div className="flex items-center gap-1 ml-2">
                            <div className="w-3 h-3 border border-border border-t-foreground rounded-full animate-spin"></div>
                            <span className="text-xs text-muted-foreground">Saving...</span>
                          </div>
                        )}
                     </div>
                   </div>
                 )}
                
                {!isWeekCompleted && (
                  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveEdit(objective.id)}
                          className="text-primary hover:text-primary hover:bg-accent h-8 w-8 sm:h-9 sm:w-9 p-0"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 sm:h-9 sm:w-9 p-0"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditObjective(objective)}
                          className="text-muted-foreground hover:text-foreground hover:bg-accent sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 sm:h-9 sm:w-9 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteObjective(objective.id)}
                          className="text-muted-foreground hover:text-foreground hover:bg-accent sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 sm:h-9 sm:w-9 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                   </div>
                 )}
               </div>
              </motion.div>
            </SortableObjectiveItem>
            );
          })}
        </AnimatePresence>
          </SortableContext>
        </DndContext>
        
        {/* Add new objective with auto-save - only show if week is not completed */}
        {!isWeekCompleted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3 border-t border-border pt-3"
          >
            <div className="flex items-center gap-3">
              <Checkbox 
                disabled 
                className="border-border opacity-50"
              />
              <Input
                value={autoSave.value}
                onChange={(e) => autoSave.setValue(e.target.value)}
                className="flex-1"
                placeholder="Add a new objective..."
              />
              {(autoSave.isSaving || autoSave.lastSaved) && (
                <AutoSaveIndicator
                  isSaving={autoSave.isSaving}
                  lastSaved={autoSave.lastSaved}
                  hasUnsavedChanges={autoSave.hasUnsavedChanges}
                />
              )}
            </div>
            
          </motion.div>
        )}
      </div>
    </div>
  );
};

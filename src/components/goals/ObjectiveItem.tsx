import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Target, Edit2, Check, RotateCcw, Pencil, X, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { Goal } from "@/types/goals";
import { celebrateSuccess } from "@/utils/confetti";
import { ObjectiveTimeBlocker } from "@/components/habits/ObjectiveTimeBlocker";
import { SortableObjectiveItem } from "./SortableObjectiveItem";
import { ObjectiveFeedbackIndicator } from "@/components/thisweek/ObjectiveFeedbackIndicator";
import { ObjectiveFeedback } from "@/hooks/useObjectiveFeedback";

interface GroupedGoals {
  in_progress: Goal[];
  not_started: Goal[];
  completed: Goal[];
}

interface ObjectiveItemProps {
  objective: WeeklyObjective;
  index: number;
  goals: Goal[];
  groupedGoals: GroupedGoals;
  isWeekCompleted: boolean;
  isEditing: boolean;
  editingText: string;
  editingGoalId: string | null;
  savingObjectiveIds: Set<string>;
  pendingUpdateIds?: Set<string>;
  recentlySavedIds?: Set<string>;
  currentWeekStart: string;
  allObjectives: WeeklyObjective[];
  agreeFeedback?: ObjectiveFeedback[];
  questionFeedback?: ObjectiveFeedback[];
  onToggleObjective: (id: string, isCompleted: boolean) => void;
  onEditObjective: (objective: WeeklyObjective) => void;
  onEditingTextChange: (text: string) => void;
  onSaveEdit: (objectiveId: string) => void;
  onCancelEdit: () => void;
  onEditGoal: (objectiveId: string, currentGoalId: string | null) => void;
  onGoalChange: (objectiveId: string, goalId: string) => void;
  onDeleteObjective: (id: string) => void;
  onUpdateObjectiveSchedule?: (id: string, day: string | null, time: string | null) => void;
  onMoveObjectiveToWeek?: (objectiveId: string, newWeekStart: string, scheduledDay: string) => void;
  onCreateNewGoal: () => void;
  getGoalName: (goalId: string | null) => string | null;
}

export const ObjectiveItem = memo(({
  objective,
  index,
  goals,
  groupedGoals,
  isWeekCompleted,
  isEditing,
  editingText,
  editingGoalId,
  savingObjectiveIds,
  pendingUpdateIds = new Set(),
  recentlySavedIds = new Set(),
  currentWeekStart,
  allObjectives,
  agreeFeedback = [],
  questionFeedback = [],
  onToggleObjective,
  onEditObjective,
  onEditingTextChange,
  onSaveEdit,
  onCancelEdit,
  onEditGoal,
  onGoalChange,
  onDeleteObjective,
  onUpdateObjectiveSchedule,
  onMoveObjectiveToWeek,
  onCreateNewGoal,
  getGoalName,
}: ObjectiveItemProps) => {
  const goalName = getGoalName(objective.goal_id);
  const isSaving = savingObjectiveIds.has(objective.id) || pendingUpdateIds.has(objective.id);
  const justSaved = recentlySavedIds.has(objective.id);

  return (
    <SortableObjectiveItem id={objective.id}>
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
              onChange={(e) => onEditingTextChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  onSaveEdit(objective.id);
                } else if (e.key === 'Escape') {
                  onCancelEdit();
                }
              }}
              className="flex-1"
              placeholder="Enter an objective..."
              autoFocus
            />
          ) : (
            <ObjectiveContent
              objective={objective}
              goalName={goalName}
              isWeekCompleted={isWeekCompleted}
              editingGoalId={editingGoalId}
              isSaving={isSaving}
              justSaved={justSaved}
              currentWeekStart={currentWeekStart}
              allObjectives={allObjectives}
              goals={goals}
              groupedGoals={groupedGoals}
              agreeFeedback={agreeFeedback}
              questionFeedback={questionFeedback}
              onEditGoal={onEditGoal}
              onGoalChange={onGoalChange}
              onUpdateObjectiveSchedule={onUpdateObjectiveSchedule}
              onMoveObjectiveToWeek={onMoveObjectiveToWeek}
              onCreateNewGoal={onCreateNewGoal}
            />
          )}
          
          {!isWeekCompleted && (
            <ObjectiveActions
              objective={objective}
              isEditing={isEditing}
              onEditObjective={() => onEditObjective(objective)}
              onSaveEdit={() => onSaveEdit(objective.id)}
              onCancelEdit={onCancelEdit}
              onDeleteObjective={() => onDeleteObjective(objective.id)}
            />
          )}
        </div>
      </motion.div>
    </SortableObjectiveItem>
  );
});

ObjectiveItem.displayName = 'ObjectiveItem';

interface ObjectiveContentProps {
  objective: WeeklyObjective;
  goalName: string | null;
  isWeekCompleted: boolean;
  editingGoalId: string | null;
  isSaving: boolean;
  justSaved: boolean;
  currentWeekStart: string;
  allObjectives: WeeklyObjective[];
  goals: Goal[];
  groupedGoals: GroupedGoals;
  agreeFeedback: ObjectiveFeedback[];
  questionFeedback: ObjectiveFeedback[];
  onEditGoal: (objectiveId: string, currentGoalId: string | null) => void;
  onGoalChange: (objectiveId: string, goalId: string) => void;
  onUpdateObjectiveSchedule?: (id: string, day: string | null, time: string | null) => void;
  onMoveObjectiveToWeek?: (objectiveId: string, newWeekStart: string, scheduledDay: string) => void;
  onCreateNewGoal: () => void;
}

const ObjectiveContent = ({
  objective,
  goalName,
  isWeekCompleted,
  editingGoalId,
  isSaving,
  justSaved,
  currentWeekStart,
  allObjectives,
  goals,
  groupedGoals,
  agreeFeedback,
  questionFeedback,
  onEditGoal,
  onGoalChange,
  onUpdateObjectiveSchedule,
  onMoveObjectiveToWeek,
  onCreateNewGoal,
}: ObjectiveContentProps) => (
  <div className="flex-1 px-1 sm:px-2 py-1 transition-all duration-300 text-foreground min-w-0">
    <div className="flex flex-wrap items-start sm:items-center gap-1 sm:gap-2">
      <span className={`text-sm sm:text-base break-words ${
        objective.is_completed 
          ? 'line-through decoration-2 decoration-muted-foreground' 
          : ''
      } transition-all duration-300`}>
        {objective.text}
      </span>
      {objective.is_completed && (
        <span className="text-primary font-medium">✨ Complete!</span>
      )}
      
      {goalName && (
        <div className="flex items-center gap-1 ml-1 sm:ml-2 max-w-[100px] sm:max-w-none">
          <Target className="h-3 w-3 text-muted-foreground flex-shrink-0 hidden sm:block" />
          <span className="text-xs text-muted-foreground truncate">→ {goalName}</span>
          {!isWeekCompleted && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEditGoal(objective.id, objective.goal_id)}
              className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground hover:bg-accent flex-shrink-0 hidden sm:flex"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      
      {editingGoalId === objective.id && !isWeekCompleted && (
        <GoalSelector
          currentGoalId={objective.goal_id}
          goals={goals}
          groupedGoals={groupedGoals}
          onGoalChange={(goalId) => onGoalChange(objective.id, goalId)}
          onClose={() => onEditGoal(objective.id, null)}
          onCreateNewGoal={onCreateNewGoal}
        />
      )}
      
      {!goalName && !isWeekCompleted && editingGoalId !== objective.id && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEditGoal(objective.id, objective.goal_id)}
          className="hidden sm:flex h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent ml-2"
        >
          <Target className="h-3 w-3 mr-1" />
          Link goal
        </Button>
      )}
      
      {!isWeekCompleted && onUpdateObjectiveSchedule && currentWeekStart && (
        <div className="hidden sm:block">
          <ObjectiveTimeBlocker
            scheduledDay={objective.scheduled_day}
            scheduledTime={objective.scheduled_time}
            onUpdate={(day, time) => onUpdateObjectiveSchedule(objective.id, day, time)}
            disabled={isWeekCompleted}
            currentWeekStart={currentWeekStart}
            onMoveToWeek={onMoveObjectiveToWeek ? (newWeekStart, scheduledDay) => onMoveObjectiveToWeek(objective.id, newWeekStart, scheduledDay) : undefined}
            allObjectives={allObjectives}
          />
        </div>
      )}
      
      {isSaving && (
        <div className="flex items-center gap-1 ml-2">
          <div className="w-3 h-3 border border-border border-t-primary rounded-full animate-spin"></div>
          <span className="text-xs text-muted-foreground">Saving...</span>
        </div>
      )}
      
      {!isSaving && justSaved && (
        <div className="flex items-center gap-1 ml-2">
          <Check className="h-3 w-3 text-primary" />
          <span className="text-xs text-primary">Saved</span>
        </div>
      )}
      
      {/* Partner Feedback Indicator */}
      {(agreeFeedback.length > 0 || questionFeedback.length > 0) && (
        <ObjectiveFeedbackIndicator
          agreeFeedback={agreeFeedback}
          questionFeedback={questionFeedback}
        />
      )}
    </div>
  </div>
);

interface GoalSelectorProps {
  currentGoalId: string | null;
  goals: Goal[];
  groupedGoals: GroupedGoals;
  onGoalChange: (goalId: string) => void;
  onClose: () => void;
  onCreateNewGoal: () => void;
}

const GoalSelector = ({
  currentGoalId,
  goals,
  groupedGoals,
  onGoalChange,
  onClose,
  onCreateNewGoal,
}: GoalSelectorProps) => (
  <div className="ml-2">
    <Select 
      value={currentGoalId || "none"} 
      onValueChange={onGoalChange}
      onOpenChange={(open) => !open && onClose()}
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
          <SelectItem value="create-new" onSelect={onCreateNewGoal}>
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
);

interface ObjectiveActionsProps {
  objective: WeeklyObjective;
  isEditing: boolean;
  onEditObjective: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDeleteObjective: () => void;
}

const ObjectiveActions = ({
  isEditing,
  onEditObjective,
  onSaveEdit,
  onCancelEdit,
  onDeleteObjective,
}: ObjectiveActionsProps) => (
  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
    {isEditing ? (
      <>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSaveEdit}
          className="text-primary hover:text-primary hover:bg-accent h-8 w-8 sm:h-9 sm:w-9 p-0"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancelEdit}
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
          onClick={onEditObjective}
          className="text-muted-foreground hover:text-foreground hover:bg-accent sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 sm:h-9 sm:w-9 p-0"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDeleteObjective}
          className="text-muted-foreground hover:text-foreground hover:bg-accent sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 sm:h-9 sm:w-9 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </>
    )}
  </div>
);

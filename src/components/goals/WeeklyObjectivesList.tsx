import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowRight, List, LayoutGrid } from "lucide-react";
import { WeeklyObjective, ObjectiveStatus } from "@/types/weeklyProgress";
import { Goal } from "@/types/goals";
import { AnimatePresence } from "framer-motion";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { ObjectiveItem } from "./ObjectiveItem";
import { InlineAddObjective } from "./InlineAddObjective";
import { EmptyObjectivesState } from "./EmptyObjectivesState";
import { ObjectivesKanbanBoard } from "./ObjectivesKanbanBoard";
import { useMyObjectivesFeedback } from "@/hooks/useObjectiveFeedback";
import { useObjectiveCommentCounts } from "@/hooks/useObjectiveComments";
import { ObjectiveCommentsSheet } from "@/components/accountability/ObjectiveCommentsSheet";
import { cn } from "@/lib/utils";

const VIEW_STORAGE_KEY = "thisweek.objectives.view";
type ObjectivesView = "list" | "board";

interface WeeklyObjectivesListProps {
  objectives: WeeklyObjective[];
  goals: Goal[];
  isWeekCompleted: boolean;
  isCreating: boolean;
  onToggleObjective: (id: string, isCompleted: boolean) => void;
  onSetObjectiveStatus?: (id: string, status: ObjectiveStatus) => void;
  onUpdateObjectiveText: (id: string, text: string) => void;
  onUpdateObjectiveGoal: (id: string, goalId: string | null) => void;
  onDeleteObjective: (id: string) => void;
  onDeleteAllObjectives: () => void;
  onAddObjective: (text: string, goalId?: string) => Promise<void>;
  onOpenCarryOver?: () => void;
  hasIncompleteObjectives?: boolean;
  isDeletingAll?: boolean;
  onReorderObjectives?: (updates: { id: string; order_index: number }[]) => void;
  onUpdateObjectiveSchedule?: (id: string, day: string | null, time: string | null) => void;
  currentWeekStart?: string;
  onMoveObjectiveToWeek?: (objectiveId: string, newWeekStart: string, scheduledDay: string) => void;
  pendingUpdateIds?: Set<string>;
  recentlySavedIds?: Set<string>;
}

export const WeeklyObjectivesList = ({
  objectives,
  goals,
  isWeekCompleted,
  isCreating,
  onToggleObjective,
  onSetObjectiveStatus,
  onUpdateObjectiveText,
  onUpdateObjectiveGoal,
  onDeleteObjective,
  onDeleteAllObjectives,
  onAddObjective,
  onOpenCarryOver,
  hasIncompleteObjectives = false,
  isDeletingAll = false,
  onReorderObjectives,
  onUpdateObjectiveSchedule,
  currentWeekStart = '',
  onMoveObjectiveToWeek,
  pendingUpdateIds = new Set(),
  recentlySavedIds = new Set(),
}: WeeklyObjectivesListProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<ObjectivesView>(() => {
    if (typeof window === "undefined") return "list";
    return (localStorage.getItem(VIEW_STORAGE_KEY) as ObjectivesView) || "list";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    }
  }, [view]);
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [savingObjectiveIds, setSavingObjectiveIds] = useState<Set<string>>(new Set());
  const [localObjectives, setLocalObjectives] = useState(objectives);

  // Get feedback for all objectives
  const objectiveIds = useMemo(() => objectives.map(o => o.id), [objectives]);
  const { getAgreeFeedback, getQuestionFeedback } = useMyObjectivesFeedback(objectiveIds);
  const { counts: commentCounts, unreadCounts } = useObjectiveCommentCounts(objectiveIds);

  // Comments sheet state
  const [commentsObjectiveId, setCommentsObjectiveId] = useState<string | null>(null);
  const [commentsObjectiveText, setCommentsObjectiveText] = useState("");

  const handleOpenComments = useCallback((objectiveId: string, objectiveText: string) => {
    setCommentsObjectiveId(objectiveId);
    setCommentsObjectiveText(objectiveText);
  }, []);

  useEffect(() => {
    setLocalObjectives(objectives);
  }, [objectives]);

  // Auto-open comments sheet from deep-link param (e.g. from notifications)
  useEffect(() => {
    const openCommentsId = searchParams.get('openComments');
    if (!openCommentsId || objectives.length === 0) return;
    const objective = objectives.find(o => o.id === openCommentsId);
    if (objective) {
      handleOpenComments(objective.id, objective.text);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('openComments');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, objectives, handleOpenComments, setSearchParams]);

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

      if (onReorderObjectives) {
        onReorderObjectives(newObjectives.map((obj, i) => ({ id: obj.id, order_index: i })));
      }
    }
  };

  const handleCreateNewGoal = () => navigate('/goals');

  const groupedGoals = {
    in_progress: goals.filter(goal => goal.status === 'in_progress'),
    not_started: goals.filter(goal => goal.status === 'not_started'),
    completed: goals.filter(goal => goal.status === 'completed'),
  };

  const getGoalName = useCallback((goalId: string | null) => {
    if (!goalId || !goals) return null;
    const goal = goals.find(g => g.id === goalId);
    return goal?.title || null;
  }, [goals]);

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
    setEditingGoalId(null);
  };

  const handleEditGoal = (objectiveId: string, currentGoalId: string | null) => {
    setEditingGoalId(objectiveId);
  };

  const setStatusHandler = onSetObjectiveStatus ?? ((id: string, status: ObjectiveStatus) => {
    // Fallback: emulate via the legacy toggle when the parent didn't wire status in.
    onToggleObjective(id, status !== "done" ? false : true);
  });

  return (
    <div>
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <Label className="text-foreground font-medium text-base sm:text-lg flex items-center gap-2">
          🎯 This Week's Objectives
          {isWeekCompleted && <span className="text-xs text-muted-foreground">🔒 Locked</span>}
        </Label>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* View toggle */}
          <div className="inline-flex items-center rounded-md border border-border bg-background p-0.5">
            <button
              type="button"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              title="List view"
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-sm text-xs transition-colors",
                view === "list"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              type="button"
              aria-pressed={view === "board"}
              onClick={() => setView("board")}
              title="Board view"
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-sm text-xs transition-colors",
                view === "board"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
          </div>
          {!isWeekCompleted && hasIncompleteObjectives && onOpenCarryOver && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCarryOver}
              className="text-xs"
            >
              <ArrowRight className="h-3 w-3 mr-1" />
              <span className="sm:inline">Carry Over</span>
              <span className="hidden sm:inline"> From Previous Weeks</span>
            </Button>
          )}
        </div>
      </div>

      <EmptyObjectivesState isEmpty={objectives.length === 0} />

      {view === "board" ? (
        <div className="mt-3 space-y-3">
          <ObjectivesKanbanBoard
            objectives={localObjectives}
            goals={goals}
            isWeekCompleted={isWeekCompleted}
            onChangeStatus={setStatusHandler}
            onReorderObjectives={onReorderObjectives}
            onEditObjective={handleEditObjective}
            onDeleteObjective={onDeleteObjective}
            pendingUpdateIds={pendingUpdateIds}
          />
          <InlineAddObjective
            onAddObjective={onAddObjective}
            isWeekCompleted={isWeekCompleted}
          />
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={localObjectives.map(obj => obj.id)} strategy={verticalListSortingStrategy}>
              <AnimatePresence mode="popLayout">
                {localObjectives.map((objective, index) => (
                  <ObjectiveItem
                    key={objective.id}
                    objective={objective}
                    index={index}
                    goals={goals}
                    groupedGoals={groupedGoals}
                    isWeekCompleted={isWeekCompleted}
                    isEditing={editingObjectiveId === objective.id}
                    editingText={editingText}
                    editingGoalId={editingGoalId}
                    savingObjectiveIds={savingObjectiveIds}
                    pendingUpdateIds={pendingUpdateIds}
                    recentlySavedIds={recentlySavedIds}
                    currentWeekStart={currentWeekStart}
                    allObjectives={localObjectives}
                    agreeFeedback={getAgreeFeedback(objective.id)}
                    questionFeedback={getQuestionFeedback(objective.id)}
                    commentCount={commentCounts[objective.id] || 0}
                    unreadCount={unreadCounts[objective.id] || 0}
                    onToggleObjective={onToggleObjective}
                    onSetObjectiveStatus={setStatusHandler}
                    onEditObjective={handleEditObjective}
                    onEditingTextChange={setEditingText}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onEditGoal={handleEditGoal}
                    onGoalChange={handleGoalChange}
                    onDeleteObjective={onDeleteObjective}
                    onUpdateObjectiveSchedule={onUpdateObjectiveSchedule}
                    onMoveObjectiveToWeek={onMoveObjectiveToWeek}
                    onCreateNewGoal={handleCreateNewGoal}
                    getGoalName={getGoalName}
                    onOpenComments={handleOpenComments}
                  />
                ))}
              </AnimatePresence>
            </SortableContext>
          </DndContext>

          <InlineAddObjective
            onAddObjective={onAddObjective}
            isWeekCompleted={isWeekCompleted}
          />
        </div>
      )}

      <ObjectiveCommentsSheet
        open={!!commentsObjectiveId}
        onOpenChange={(open) => { if (!open) setCommentsObjectiveId(null); }}
        objectiveId={commentsObjectiveId}
        objectiveText={commentsObjectiveText}
      />
    </div>
  );
};

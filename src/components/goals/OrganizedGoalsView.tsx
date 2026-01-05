import { useState, useMemo } from "react";
import { Goal, GoalStatus, GoalVisibility } from "@/types/goals";
import { GoalCard } from "./GoalCard";
import { DraggableGoalCard } from "./DraggableGoalCard";
import { DroppableColumn } from "./DroppableColumn";
import { CollapsibleGoalSection } from "./CollapsibleGoalSection";
import { GoalYearGroup } from "./GoalYearGroup";
import { CarryOverBanner } from "./CarryOverBanner";
import { GoalSearchFilter, GoalFilters } from "./GoalSearchFilter";
import { Clock, Play, Archive, Trophy, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter, DragOverEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";

interface OrganizedGoalsViewProps {
  activeGoals: Goal[];
  deprioritizedGoals: Goal[];
  completedGoalsByYear: Record<number, Goal[]>;
  previousYearUnfinishedGoals: Goal[];
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: GoalStatus) => void;
  onGoalClick?: (goal: Goal) => void;
  onDeprioritize: (id: string) => void;
  onReprioritize: (id: string) => void;
  onPauseToggle?: (id: string, isPaused: boolean) => void;
  onVisibilityChange?: (id: string, visibility: GoalVisibility) => void;
  onCarryOverAll: () => void;
  onDeprioritizeAll: () => void;
  onReorder?: (reorderedGoals: { id: string; order_index: number }[]) => void;
  isLoading?: boolean;
  habitStreaks?: Record<string, number>; // Map of goal ID to current streak
}

const initialFilters: GoalFilters = {
  search: '',
  statuses: [],
  categories: [],
  timeframes: [],
  showPausedOnly: false
};

export const OrganizedGoalsView = ({
  activeGoals,
  deprioritizedGoals,
  completedGoalsByYear,
  previousYearUnfinishedGoals,
  onEdit,
  onDelete,
  onStatusChange,
  onGoalClick,
  onDeprioritize,
  onReprioritize,
  onPauseToggle,
  onVisibilityChange,
  onCarryOverAll,
  onDeprioritizeAll,
  onReorder,
  isLoading = false,
  habitStreaks = {}
}: OrganizedGoalsViewProps) => {
  const isMobile = useIsMobile();
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState<GoalFilters>(initialFilters);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // Map column IDs to statuses
  const columnStatusMap: Record<string, GoalStatus> = {
    'not_started': 'not_started',
    'in_progress': 'in_progress',
    'completed': 'completed',
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const goal = active.data.current?.goal as Goal;
    if (goal) {
      setActiveGoal(goal);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGoal(null);

    if (!over) return;

    const goalId = active.id as string;
    const goal = active.data.current?.goal as Goal;
    const overId = over.id as string;
    const overGoal = over.data.current?.goal as Goal | undefined;

    // Check if dropped on a column (for status change)
    if (columnStatusMap[overId] && goal) {
      const newStatus = columnStatusMap[overId];
      
      // Only update if status changed
      if (goal.status !== newStatus) {
        onStatusChange(goalId, newStatus);
        
        const statusLabels = {
          'not_started': 'Not Started',
          'in_progress': 'In Progress',
          'completed': 'Completed',
        };
        toast.success(`Goal moved to ${statusLabels[newStatus]}`);
      }
      return;
    }

    // Check if dropped on another goal (for reordering)
    if (overGoal && goal && onReorder) {
      const sourceStatus = goal.status;
      const targetStatus = overGoal.status;

      // If same status, reorder within the column
      if (sourceStatus === targetStatus) {
        const goalsInColumn = sourceStatus === 'not_started' 
          ? [...notStartedGoals]
          : sourceStatus === 'in_progress' 
            ? [...inProgressGoals] 
            : [...currentYearCompletedGoals];
            
        const oldIndex = goalsInColumn.findIndex(g => g.id === goalId);
        const newIndex = goalsInColumn.findIndex(g => g.id === overId);
        
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          // Use arrayMove to reorder the array
          const reordered = arrayMove(goalsInColumn, oldIndex, newIndex);
          
          // Create the update payload with new order indices
          const updates = reordered.map((g, index) => ({
            id: g.id,
            order_index: index
          }));
          
          onReorder(updates);
        }
      } else {
        // Moving to different column - change status
        onStatusChange(goalId, targetStatus);
        
        const statusLabels: Record<string, string> = {
          'not_started': 'Not Started',
          'in_progress': 'In Progress',
          'completed': 'Completed',
        };
        toast.success(`Goal moved to ${statusLabels[targetStatus]}`);
      }
    }
  };

  // Get all goals for filtering
  const allGoals = useMemo(() => {
    const completed = Object.values(completedGoalsByYear).flat();
    return [...activeGoals, ...deprioritizedGoals, ...completed];
  }, [activeGoals, deprioritizedGoals, completedGoalsByYear]);

  // Extract unique categories
  const availableCategories = useMemo(() => {
    const categories = allGoals
      .map(g => g.category)
      .filter((c): c is string => !!c && c.trim() !== '');
    return [...new Set(categories)].sort();
  }, [allGoals]);

  // Filter function
  const filterGoal = (goal: Goal): boolean => {
    // Paused filter (only show paused habits)
    if (filters.showPausedOnly) {
      const hasHabits = goal.habit_items && goal.habit_items.length > 0;
      if (!hasHabits || !goal.is_paused) return false;
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        goal.title.toLowerCase().includes(searchLower) ||
        goal.description?.toLowerCase().includes(searchLower) ||
        goal.category?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.statuses.length > 0 && !filters.statuses.includes(goal.status)) {
      return false;
    }

    // Category filter
    if (filters.categories.length > 0 && (!goal.category || !filters.categories.includes(goal.category))) {
      return false;
    }

    // Timeframe filter
    if (filters.timeframes.length > 0 && !filters.timeframes.includes(goal.timeframe as any)) {
      return false;
    }

    return true;
  };

  // Apply filters to all goal lists
  const filteredActiveGoals = useMemo(() => 
    activeGoals.filter(filterGoal), 
    [activeGoals, filters]
  );
  
  const filteredDeprioritizedGoals = useMemo(() => 
    deprioritizedGoals.filter(filterGoal), 
    [deprioritizedGoals, filters]
  );
  
  const filteredCompletedGoalsByYear = useMemo(() => {
    const filtered: Record<number, Goal[]> = {};
    for (const [year, goals] of Object.entries(completedGoalsByYear)) {
      const filteredGoals = goals.filter(filterGoal);
      if (filteredGoals.length > 0) {
        filtered[Number(year)] = filteredGoals;
      }
    }
    return filtered;
  }, [completedGoalsByYear, filters]);

  const notStartedGoals = filteredActiveGoals.filter(g => g.status === 'not_started');
  const inProgressGoals = filteredActiveGoals.filter(g => g.status === 'in_progress');
  
  // Get current year's completed goals for the main view
  const currentYearCompletedGoals = filteredCompletedGoalsByYear[currentYear] || [];
  
  // Get previous years' completed goals for the collapsible section
  const previousYearsCompletedGoals = useMemo(() => {
    const filtered: Record<number, Goal[]> = {};
    for (const [year, goals] of Object.entries(filteredCompletedGoalsByYear)) {
      if (Number(year) !== currentYear && goals.length > 0) {
        filtered[Number(year)] = goals;
      }
    }
    return filtered;
  }, [filteredCompletedGoalsByYear, currentYear]);
  
  const previousCompletedYears = Object.keys(previousYearsCompletedGoals)
    .map(Number)
    .sort((a, b) => b - a);

  const totalFiltered = filteredActiveGoals.length + filteredDeprioritizedGoals.length + 
    Object.values(filteredCompletedGoalsByYear).reduce((acc, goals) => acc + goals.length, 0);

  const totalCompleted = Object.values(filteredCompletedGoalsByYear).reduce(
    (acc, goals) => acc + goals.length, 0
  );
  
  const previousYearsCompletedCount = Object.values(previousYearsCompletedGoals).reduce(
    (acc, goals) => acc + goals.length, 0
  );
  const hasActiveFilters = filters.search || filters.statuses.length > 0 || 
    filters.categories.length > 0 || filters.timeframes.length > 0 || filters.showPausedOnly;

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <GoalSearchFilter
        filters={filters}
        onFiltersChange={setFilters}
        availableCategories={availableCategories}
      />

      {/* No Results State */}
      {hasActiveFilters && totalFiltered === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <SearchX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No goals found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Only show content if there are results or no filters active */}
      {(!hasActiveFilters || totalFiltered > 0) && (
        <>
          {/* Carry Over Banner */}
          {!hasActiveFilters && (
            <CarryOverBanner
              goals={previousYearUnfinishedGoals}
              onCarryOver={onCarryOverAll}
              onArchive={onDeprioritizeAll}
              isLoading={isLoading}
            />
          )}

          {/* Active Goals Section */}
          {(filteredActiveGoals.length > 0 || currentYearCompletedGoals.length > 0 || !hasActiveFilters) && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-foreground font-heading">Active Goals</h2>
                <Badge variant="secondary" className="text-xs">
                  {filteredActiveGoals.length + currentYearCompletedGoals.length}
                </Badge>
                {!isMobile && (
                  <span className="text-xs text-muted-foreground ml-2">
                    Drag to move between columns
                  </span>
                )}
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-6'}`}>
                  {/* Not Started Column */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">Not Started</span>
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {notStartedGoals.length}
                      </Badge>
                    </div>
                    <SortableContext items={notStartedGoals.map(g => g.id)} strategy={verticalListSortingStrategy}>
                      <DroppableColumn id="not_started" isEmpty={notStartedGoals.length === 0}>
                        {notStartedGoals.length === 0 ? (
                          <div className="border-2 border-dashed rounded-lg p-6 text-center">
                            <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground text-sm">
                              {hasActiveFilters ? 'No matching goals' : 'Drop a goal here'}
                            </p>
                          </div>
                        ) : (
                          notStartedGoals.map((goal) => (
                            <DraggableGoalCard
                              key={goal.id}
                              goal={goal}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onStatusChange={onStatusChange}
                              onClick={onGoalClick}
                              onDeprioritize={onDeprioritize}
                              onReprioritize={onReprioritize}
                              onPauseToggle={onPauseToggle}
                              onVisibilityChange={onVisibilityChange}
                              currentStreak={goal.habit_items && goal.habit_items.length > 0 ? habitStreaks[goal.id] : undefined}
                            />
                          ))
                        )}
                      </DroppableColumn>
                    </SortableContext>
                  </div>

                  {/* In Progress Column */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                      <Play className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">In Progress</span>
                      <Badge className="bg-primary/10 text-primary text-xs ml-auto">
                        {inProgressGoals.length}
                      </Badge>
                    </div>
                    <SortableContext items={inProgressGoals.map(g => g.id)} strategy={verticalListSortingStrategy}>
                      <DroppableColumn id="in_progress" isEmpty={inProgressGoals.length === 0}>
                        {inProgressGoals.length === 0 ? (
                          <div className="border-2 border-dashed rounded-lg p-6 text-center">
                            <Play className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground text-sm">
                              {hasActiveFilters ? 'No matching goals' : 'Drop a goal here'}
                            </p>
                          </div>
                        ) : (
                          inProgressGoals.map((goal) => (
                            <DraggableGoalCard
                              key={goal.id}
                              goal={goal}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onStatusChange={onStatusChange}
                              onClick={onGoalClick}
                              onDeprioritize={onDeprioritize}
                              onReprioritize={onReprioritize}
                              onPauseToggle={onPauseToggle}
                              onVisibilityChange={onVisibilityChange}
                              currentStreak={goal.habit_items && goal.habit_items.length > 0 ? habitStreaks[goal.id] : undefined}
                            />
                          ))
                        )}
                      </DroppableColumn>
                    </SortableContext>
                  </div>

                  {/* Completed Column (Current Year) */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                      <Trophy className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-foreground">Completed</span>
                      <Badge className="bg-green-100 text-green-800 text-xs ml-auto">
                        {currentYearCompletedGoals.length}
                      </Badge>
                    </div>
                    <SortableContext items={currentYearCompletedGoals.map(g => g.id)} strategy={verticalListSortingStrategy}>
                      <DroppableColumn id="completed" isEmpty={currentYearCompletedGoals.length === 0}>
                        {currentYearCompletedGoals.length === 0 ? (
                          <div className="border-2 border-dashed rounded-lg p-6 text-center">
                            <Trophy className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground text-sm">
                              {hasActiveFilters ? 'No matching goals' : 'Drop a goal here'}
                            </p>
                          </div>
                        ) : (
                          currentYearCompletedGoals.map((goal) => (
                            <DraggableGoalCard
                              key={goal.id}
                              goal={goal}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onStatusChange={onStatusChange}
                              onClick={onGoalClick}
                              onDeprioritize={onDeprioritize}
                              onReprioritize={onReprioritize}
                              onPauseToggle={onPauseToggle}
                              onVisibilityChange={onVisibilityChange}
                              currentStreak={goal.habit_items && goal.habit_items.length > 0 ? habitStreaks[goal.id] : undefined}
                            />
                          ))
                        )}
                      </DroppableColumn>
                    </SortableContext>
                  </div>
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                  {activeGoal ? (
                    <div className="opacity-90 rotate-2 scale-105">
                      <GoalCard
                        goal={activeGoal}
                        onEdit={() => {}}
                        onDelete={() => {}}
                        onStatusChange={() => {}}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </section>
          )}

          {/* Deprioritized Section */}
          {filteredDeprioritizedGoals.length > 0 && (
            <section>
              <CollapsibleGoalSection
                title="Deprioritized"
                count={filteredDeprioritizedGoals.length}
                icon={<Archive className="h-4 w-4 text-muted-foreground" />}
                variant="muted"
                defaultOpen={hasActiveFilters ? true : false}
              >
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-3`}>
                  {filteredDeprioritizedGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onStatusChange={onStatusChange}
                      onClick={onGoalClick}
                      onDeprioritize={onDeprioritize}
                      onReprioritize={onReprioritize}
                      onPauseToggle={onPauseToggle}
                      isDeprioritized
                    />
                  ))}
                </div>
              </CollapsibleGoalSection>
            </section>
          )}

          {/* Previous Years Completed Goals Section */}
          {previousYearsCompletedCount > 0 && (
            <section>
              <CollapsibleGoalSection
                title="Previous Years"
                count={previousYearsCompletedCount}
                icon={<Trophy className="h-4 w-4 text-green-600" />}
                variant="muted"
                defaultOpen={false}
              >
                <div className="space-y-3">
                  {previousCompletedYears.map((year) => (
                    <GoalYearGroup
                      key={year}
                      year={year}
                      goals={previousYearsCompletedGoals[year]}
                      currentYear={currentYear}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onStatusChange={onStatusChange}
                      onClick={onGoalClick}
                      onDeprioritize={onDeprioritize}
                      onReprioritize={onReprioritize}
                    />
                  ))}
                </div>
              </CollapsibleGoalSection>
            </section>
          )}

          {/* Empty State - Only show when no filters and no goals */}
          {!hasActiveFilters && activeGoals.length === 0 && deprioritizedGoals.length === 0 && Object.keys(completedGoalsByYear).length === 0 && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No goals yet</h3>
              <p className="text-muted-foreground">Create your first goal to start tracking your progress</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

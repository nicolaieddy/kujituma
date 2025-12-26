import { useState, useMemo } from "react";
import { Goal, GoalStatus } from "@/types/goals";
import { GoalCard } from "./GoalCard";
import { CollapsibleGoalSection } from "./CollapsibleGoalSection";
import { GoalYearGroup } from "./GoalYearGroup";
import { CarryOverBanner } from "./CarryOverBanner";
import { GoalSearchFilter, GoalFilters } from "./GoalSearchFilter";
import { Clock, Play, Archive, Trophy, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

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
  onCarryOverAll: () => void;
  onDeprioritizeAll: () => void;
  isLoading?: boolean;
}

const initialFilters: GoalFilters = {
  search: '',
  statuses: [],
  categories: [],
  timeframes: []
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
  onCarryOverAll,
  onDeprioritizeAll,
  isLoading = false
}: OrganizedGoalsViewProps) => {
  const isMobile = useIsMobile();
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState<GoalFilters>(initialFilters);

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
  
  const completedYears = Object.keys(filteredCompletedGoalsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  const totalFiltered = filteredActiveGoals.length + filteredDeprioritizedGoals.length + 
    Object.values(filteredCompletedGoalsByYear).reduce((acc, goals) => acc + goals.length, 0);

  const totalCompleted = Object.values(filteredCompletedGoalsByYear).reduce(
    (acc, goals) => acc + goals.length, 0
  );

  const hasActiveFilters = filters.search || filters.statuses.length > 0 || 
    filters.categories.length > 0 || filters.timeframes.length > 0;

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
          {(filteredActiveGoals.length > 0 || !hasActiveFilters) && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-foreground font-serif">Active Goals</h2>
                <Badge variant="secondary" className="text-xs">
                  {filteredActiveGoals.length}
                </Badge>
              </div>

              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6'}`}>
                {/* Not Started Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">Not Started</span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {notStartedGoals.length}
                    </Badge>
                  </div>
                  <div className="space-y-3 min-h-[100px]">
                    {notStartedGoals.length === 0 ? (
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">
                          {hasActiveFilters ? 'No matching goals' : 'No goals waiting to start'}
                        </p>
                      </div>
                    ) : (
                      notStartedGoals.map((goal) => (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onStatusChange={onStatusChange}
                          onClick={onGoalClick}
                          onDeprioritize={onDeprioritize}
                          onReprioritize={onReprioritize}
                        />
                      ))
                    )}
                  </div>
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
                  <div className="space-y-3 min-h-[100px]">
                    {inProgressGoals.length === 0 ? (
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <Play className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">
                          {hasActiveFilters ? 'No matching goals' : 'No goals in progress'}
                        </p>
                      </div>
                    ) : (
                      inProgressGoals.map((goal) => (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onStatusChange={onStatusChange}
                          onClick={onGoalClick}
                          onDeprioritize={onDeprioritize}
                          onReprioritize={onReprioritize}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
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
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
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
                      isDeprioritized
                    />
                  ))}
                </div>
              </CollapsibleGoalSection>
            </section>
          )}

          {/* Completed Goals Section */}
          {totalCompleted > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground font-serif">Completed Goals</h2>
                <Badge className="bg-primary/10 text-primary text-xs">
                  {totalCompleted}
                </Badge>
              </div>

              <div className="space-y-3">
                {completedYears.map((year) => (
                  <GoalYearGroup
                    key={year}
                    year={year}
                    goals={filteredCompletedGoalsByYear[year]}
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

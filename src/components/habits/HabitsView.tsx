import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Flame, Target, TrendingUp, Plus, Pause, PlayCircle, Calendar, Clock, Pencil, Trash2, ArrowUpDown, SearchX } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHabitStats } from "@/hooks/useHabitStats";
import { useGoals } from "@/hooks/useGoals";
import { HabitCard } from "./HabitCard";
import { HabitDetailModal } from "./HabitDetailModal";
import { HabitStreakLeaderboard } from "./HabitStreakLeaderboard";
import { HabitSearchFilter, HabitFilters } from "./HabitSearchFilter";
import { SystemRitualsSection } from "./SystemRitualsSection";
import { HabitStats } from "@/services/habitStreaksService";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, startOfDay } from "date-fns";
import { Goal, RecurrenceFrequency } from "@/types/goals";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface HabitsViewProps {
  onCreateGoal?: () => void;
  onEditGoal?: (goal: Goal) => void;
}

const initialFilters: HabitFilters = {
  search: '',
  frequencies: [],
  categories: [],
  showPausedOnly: false,
  showActiveOnly: false
};

export const HabitsView = ({ onCreateGoal, onEditGoal }: HabitsViewProps) => {
  const { habitStats, futureHabits, isLoading, refetch, totalHabits, activeHabits, averageCompletionRate, totalCurrentStreak } = useHabitStats();
  const { togglePauseGoal, deleteGoal } = useGoals();
  const isMobile = useIsMobile();
  const [selectedHabit, setSelectedHabit] = useState<HabitStats | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [scheduledSort, setScheduledSort] = useState<'date' | 'alpha' | 'frequency'>('date');
  const [filters, setFilters] = useState<HabitFilters>(initialFilters);

  const handleHabitClick = (stats: HabitStats) => {
    setSelectedHabit(stats);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedHabit(null);
  };

  const handleUpdate = () => {
    refetch();
  };

  const handleResume = (goalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    togglePauseGoal(goalId, false);
    refetch();
  };

  const handleDeleteScheduledHabit = () => {
    if (goalToDelete) {
      deleteGoal(goalToDelete.id);
      setGoalToDelete(null);
      // Refetch after a short delay to let the mutation complete
      setTimeout(() => refetch(), 500);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Loading habits...
      </div>
    );
  }

  // Show empty state only if no habits AND no future habits
  // But still show system rituals
  if (habitStats.length === 0 && futureHabits.length === 0) {
    return (
      <div className="space-y-8">
        {/* System Rituals - always shown */}
        <SystemRitualsSection />

        {/* Empty state for user-created habits */}
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <div className="mb-6">
            <RefreshCw className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Custom Habits Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Create a goal with recurring objectives to start tracking your own habits. 
              Habits automatically create weekly objectives to help you build consistency.
            </p>
          </div>
          {onCreateGoal && (
            <Button onClick={onCreateGoal} className="gradient-primary shadow-elegant">
              <Plus className="h-4 w-4 mr-2" />
              Create Recurring Goal
            </Button>
          )}
        </div>
      </div>
    );
  }

  const getFrequencyLabel = (frequency: string | null | undefined): string => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekdays: 'Weekdays',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      monthly_last_week: 'Monthly (last week)',
      quarterly: 'Quarterly'
    };
    return labels[frequency || ''] || 'Recurring';
  };

  // Extract unique categories from all habits
  const availableCategories = useMemo(() => {
    const allHabits = [...habitStats.map(h => h.goal), ...futureHabits];
    const categories = allHabits
      .map(g => g.category)
      .filter((c): c is string => !!c && c.trim() !== '');
    return [...new Set(categories)].sort();
  }, [habitStats, futureHabits]);

  // Filter function for habit stats
  const filterHabitStats = (stats: HabitStats): boolean => {
    const goal = stats.goal;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        goal.title.toLowerCase().includes(searchLower) ||
        goal.description?.toLowerCase().includes(searchLower) ||
        goal.category?.toLowerCase().includes(searchLower) ||
        goal.recurring_objective_text?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Frequency filter
    if (filters.frequencies.length > 0) {
      if (!goal.recurrence_frequency || !filters.frequencies.includes(goal.recurrence_frequency as RecurrenceFrequency)) {
        return false;
      }
    }

    // Category filter
    if (filters.categories.length > 0) {
      if (!goal.category || !filters.categories.includes(goal.category)) {
        return false;
      }
    }

    // Status filters
    if (filters.showPausedOnly && !goal.is_paused) return false;
    if (filters.showActiveOnly && goal.is_paused) return false;

    return true;
  };

  // Filter function for future habits (Goal objects)
  const filterFutureHabit = (goal: Goal): boolean => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        goal.title.toLowerCase().includes(searchLower) ||
        goal.description?.toLowerCase().includes(searchLower) ||
        goal.category?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Frequency filter
    if (filters.frequencies.length > 0) {
      if (!goal.recurrence_frequency || !filters.frequencies.includes(goal.recurrence_frequency as RecurrenceFrequency)) {
        return false;
      }
    }

    // Category filter
    if (filters.categories.length > 0) {
      if (!goal.category || !filters.categories.includes(goal.category)) {
        return false;
      }
    }

    return true;
  };

  // Apply filters to habit lists
  const filteredHabitStats = useMemo(() => 
    habitStats.filter(filterHabitStats), 
    [habitStats, filters]
  );

  const filteredFutureHabits = useMemo(() => 
    futureHabits.filter(filterFutureHabit), 
    [futureHabits, filters]
  );

  // Separate active, paused, and completed/deprioritized habits from filtered list
  const activeHabitsList = filteredHabitStats.filter(h => 
    (h.goal.status === 'not_started' || h.goal.status === 'in_progress') && !h.goal.is_paused
  );
  const pausedHabitsList = filteredHabitStats.filter(h => 
    h.goal.is_paused && h.goal.status !== 'completed' && h.goal.status !== 'deprioritized'
  );
  const inactiveHabitsList = filteredHabitStats.filter(h => 
    h.goal.status === 'completed' || h.goal.status === 'deprioritized'
  );

  const hasActiveFilters = filters.search || filters.frequencies.length > 0 || 
    filters.categories.length > 0 || filters.showPausedOnly || filters.showActiveOnly;

  const totalFiltered = filteredHabitStats.length + filteredFutureHabits.length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <Card className="glass-card">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeHabits}</p>
                <p className="text-xs text-muted-foreground">Active Habits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCurrentStreak}</p>
                <p className="text-xs text-muted-foreground">Total Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{averageCompletionRate}%</p>
                <p className="text-xs text-muted-foreground">Avg. Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalHabits}</p>
                <p className="text-xs text-muted-foreground">Total Habits</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Habit Button - positioned after stats like Goals tab */}
      {onCreateGoal && (
        <div className="flex justify-center">
          <Button 
            onClick={onCreateGoal}
            className="gradient-primary shadow-elegant gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Habit
          </Button>
        </div>
      )}

      {/* Search and Filter */}
      <HabitSearchFilter
        filters={filters}
        onFiltersChange={setFilters}
        availableCategories={availableCategories}
      />

      {/* System Rituals - always visible, not affected by filters */}
      {!hasActiveFilters && <SystemRitualsSection />}

      {hasActiveFilters && totalFiltered === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <SearchX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No habits found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Streak Leaderboard - only show when no filters or has results */}
      {(!hasActiveFilters || totalFiltered > 0) && (
        <HabitStreakLeaderboard 
          habitStats={filteredHabitStats} 
          onHabitClick={handleHabitClick}
        />
      )}

      {/* Active Habits */}
      {activeHabitsList.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              Active Habits
            </h3>
            <Badge variant="secondary">{activeHabitsList.length}</Badge>
          </div>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
            {activeHabitsList.map(stats => (
              <HabitCard 
                key={stats.goal.id} 
                habitStats={stats} 
                onClick={() => handleHabitClick(stats)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Paused Habits */}
      {pausedHabitsList.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
              <Pause className="h-5 w-5" />
              Paused Habits
            </h3>
            <Badge variant="outline" className="border-slate-500/30 text-slate-500">
              {pausedHabitsList.length}
            </Badge>
          </div>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
            {pausedHabitsList.map(stats => (
              <div key={stats.goal.id} className="relative">
                <HabitCard 
                  habitStats={stats} 
                  onClick={() => handleHabitClick(stats)}
                  isPaused
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-3 right-3 gap-1.5 bg-background/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground"
                  onClick={(e) => handleResume(stats.goal.id, e)}
                >
                  <PlayCircle className="h-4 w-4" />
                  Resume
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Habits (Future) */}
      {filteredFutureHabits.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-5 w-5" />
              Scheduled Habits
            </h3>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span className="text-xs">
                      {scheduledSort === 'date' ? 'Date' : scheduledSort === 'alpha' ? 'A-Z' : 'Frequency'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setScheduledSort('date')}>
                    By Start Date
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setScheduledSort('alpha')}>
                    Alphabetically
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setScheduledSort('frequency')}>
                    By Frequency
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Badge variant="outline" className="border-blue-500/30 text-blue-500">
                {filteredFutureHabits.length}
              </Badge>
            </div>
          </div>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
            {[...filteredFutureHabits]
              .sort((a: Goal, b: Goal) => {
                if (scheduledSort === 'date') {
                  const dateA = a.start_date ? new Date(a.start_date).getTime() : Infinity;
                  const dateB = b.start_date ? new Date(b.start_date).getTime() : Infinity;
                  return dateA - dateB;
                }
                if (scheduledSort === 'alpha') {
                  return a.title.localeCompare(b.title);
                }
                // frequency sort
                const freqOrder: Record<string, number> = {
                  daily: 1, weekdays: 2, weekly: 3, biweekly: 4, monthly: 5, monthly_last_week: 6, quarterly: 7
                };
                const orderA = freqOrder[a.recurrence_frequency || ''] || 99;
                const orderB = freqOrder[b.recurrence_frequency || ''] || 99;
                return orderA - orderB;
              })
              .map((goal: Goal) => (
              <Card key={goal.id} className="glass-card border-dashed border-blue-500/30">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{goal.title}</h4>
                      {goal.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {goal.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-2 shrink-0 bg-blue-500/10 text-blue-600">
                      {getFrequencyLabel(goal.recurrence_frequency)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        Starts {goal.start_date ? format(parseISO(goal.start_date), 'MMM d, yyyy') : 'Soon'}
                      </span>
                      {goal.start_date && (
                        <Badge variant="outline" className="ml-1 text-xs border-blue-500/30 text-blue-500">
                          {(() => {
                            const daysUntil = differenceInDays(startOfDay(parseISO(goal.start_date)), startOfDay(new Date()));
                            if (daysUntil === 0) return 'Starts today';
                            if (daysUntil === 1) return 'Starts tomorrow';
                            return `${daysUntil} days`;
                          })()}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {onEditGoal && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => onEditGoal(goal)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setGoalToDelete(goal)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Inactive Habits */}
      {inactiveHabitsList.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-muted-foreground">
              Completed / Archived Habits
            </h3>
            <Badge variant="outline">{inactiveHabitsList.length}</Badge>
          </div>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
            {inactiveHabitsList.map(stats => (
              <HabitCard 
                key={stats.goal.id} 
                habitStats={stats}
                onClick={() => handleHabitClick(stats)}
              />
            ))}
          </div>
        </div>
      )}


      {/* Habit Detail Modal */}
      <HabitDetailModal
        habitStats={selectedHabit}
        isOpen={showDetailModal}
        onClose={handleCloseModal}
        onUpdate={handleUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!goalToDelete} onOpenChange={(open) => !open && setGoalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Habit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{goalToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteScheduledHabit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

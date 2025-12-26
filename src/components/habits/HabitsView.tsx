import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Flame, Target, TrendingUp, Plus } from "lucide-react";
import { useHabitStats } from "@/hooks/useHabitStats";
import { HabitCard } from "./HabitCard";
import { HabitDetailModal } from "./HabitDetailModal";
import { HabitStats } from "@/services/habitStreaksService";
import { useIsMobile } from "@/hooks/use-mobile";

interface HabitsViewProps {
  onCreateGoal?: () => void;
}

export const HabitsView = ({ onCreateGoal }: HabitsViewProps) => {
  const { habitStats, isLoading, refetch, totalHabits, activeHabits, averageCompletionRate, totalCurrentStreak } = useHabitStats();
  const isMobile = useIsMobile();
  const [selectedHabit, setSelectedHabit] = useState<HabitStats | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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

  if (isLoading) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Loading habits...
      </div>
    );
  }

  if (habitStats.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-6">
          <RefreshCw className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Habits Yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Create a goal with recurring objectives to start tracking your habits. 
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
    );
  }

  // Separate active and completed/deprioritized habits
  const activeHabitsList = habitStats.filter(h => 
    h.goal.status === 'not_started' || h.goal.status === 'in_progress'
  );
  const inactiveHabitsList = habitStats.filter(h => 
    h.goal.status === 'completed' || h.goal.status === 'deprioritized'
  );

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

      {/* Inactive Habits */}
      {inactiveHabitsList.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-muted-foreground">
              Completed / Paused Habits
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

      {/* Add Habit Button */}
      {onCreateGoal && (
        <div className="text-center pt-4">
          <Button 
            variant="outline" 
            onClick={onCreateGoal}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Habit
          </Button>
        </div>
      )}

      {/* Habit Detail Modal */}
      <HabitDetailModal
        habitStats={selectedHabit}
        isOpen={showDetailModal}
        onClose={handleCloseModal}
        onUpdate={handleUpdate}
      />
    </div>
  );
};

import { Goal, GoalStatus } from "@/types/goals";
import { GoalCard } from "./GoalCard";
import { CollapsibleGoalSection } from "./CollapsibleGoalSection";
import { GoalYearGroup } from "./GoalYearGroup";
import { CarryOverBanner } from "./CarryOverBanner";
import { Clock, Play, Archive, Trophy } from "lucide-react";
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
  
  const notStartedGoals = activeGoals.filter(g => g.status === 'not_started');
  const inProgressGoals = activeGoals.filter(g => g.status === 'in_progress');
  
  const completedYears = Object.keys(completedGoalsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  const totalCompleted = Object.values(completedGoalsByYear).reduce(
    (acc, goals) => acc + goals.length, 0
  );

  return (
    <div className="space-y-8">
      {/* Carry Over Banner */}
      <CarryOverBanner
        goals={previousYearUnfinishedGoals}
        onCarryOver={onCarryOverAll}
        onArchive={onDeprioritizeAll}
        isLoading={isLoading}
      />

      {/* Active Goals Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold text-foreground font-serif">Active Goals</h2>
          <Badge variant="secondary" className="text-xs">
            {activeGoals.length}
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
                  <p className="text-muted-foreground text-sm">No goals waiting to start</p>
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
                  <p className="text-muted-foreground text-sm">No goals in progress</p>
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

      {/* Deprioritized Section */}
      {deprioritizedGoals.length > 0 && (
        <section>
          <CollapsibleGoalSection
            title="Deprioritized"
            count={deprioritizedGoals.length}
            icon={<Archive className="h-4 w-4 text-muted-foreground" />}
            variant="muted"
          >
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
              {deprioritizedGoals.map((goal) => (
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
                goals={completedGoalsByYear[year]}
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

      {/* Empty State */}
      {activeGoals.length === 0 && deprioritizedGoals.length === 0 && totalCompleted === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No goals yet</h3>
          <p className="text-muted-foreground">Create your first goal to start tracking your progress</p>
        </div>
      )}
    </div>
  );
};

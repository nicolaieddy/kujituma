import { Goal, GoalStatus } from "@/types/goals";
import { GoalCard } from "./GoalCard";
import { CollapsibleGoalSection } from "./CollapsibleGoalSection";
import { CheckCircle } from "lucide-react";

interface GoalYearGroupProps {
  year: number;
  goals: Goal[];
  currentYear: number;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: GoalStatus) => void;
  onClick?: (goal: Goal) => void;
  onDeprioritize?: (id: string) => void;
  onReprioritize?: (id: string) => void;
}

export const GoalYearGroup = ({
  year,
  goals,
  currentYear,
  onEdit,
  onDelete,
  onStatusChange,
  onClick,
  onDeprioritize,
  onReprioritize
}: GoalYearGroupProps) => {
  const isCurrentYear = year === currentYear;

  return (
    <CollapsibleGoalSection
      title={`${year}`}
      count={goals.length}
      icon={<CheckCircle className="h-4 w-4 text-primary" />}
      defaultOpen={isCurrentYear}
      variant="success"
    >
      <div className="space-y-3">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onClick={onClick}
            onDeprioritize={onDeprioritize}
            onReprioritize={onReprioritize}
          />
        ))}
      </div>
    </CollapsibleGoalSection>
  );
};

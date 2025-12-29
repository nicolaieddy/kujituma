import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Goal } from "@/types/goals";
import { RefreshCw, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface HabitItemsCardProps {
  goal: Goal;
}

const frequencyLabels: Record<string, string> = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  monthly_last_week: 'Monthly (Last Week)',
  quarterly: 'Quarterly'
};

export const HabitItemsCard = ({ goal }: HabitItemsCardProps) => {
  // Combine habit_items with recurring objective if exists
  const baseHabitItems = goal.habit_items || [];
  
  // If goal has recurring objective, treat it as a habit item too
  const recurringHabit = goal.is_recurring && goal.recurring_objective_text ? {
    id: `recurring-${goal.id}`,
    text: goal.recurring_objective_text,
    frequency: goal.recurrence_frequency || 'weekly'
  } : null;

  const habitItems = recurringHabit 
    ? [recurringHabit, ...baseHabitItems]
    : baseHabitItems;
    
  const hasHabits = habitItems.length > 0;

  if (!hasHabits) return null;

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Habits ({habitItems.length})
          </CardTitle>
          <Link 
            to={`/?tab=habits&highlightGoal=${goal.id}`}
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
          >
            Track in Habits
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <p className="text-muted-foreground text-xs">
          Recurring actions tied to this goal
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {habitItems.map((habit) => (
            <div 
              key={habit.id} 
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
            >
              <span className="text-foreground text-sm">{habit.text}</span>
              <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/50 text-xs">
                {frequencyLabels[habit.frequency] || habit.frequency}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

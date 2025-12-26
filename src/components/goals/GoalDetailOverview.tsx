import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Goal } from "@/types/goals";
import { formatRelativeTime } from "@/utils/dateUtils";
import { Calendar, Tag, StickyNote, Target, RefreshCw } from "lucide-react";
import { useHabitCompletions } from "@/hooks/useHabitCompletions";
import { format } from "date-fns";

interface GoalDetailOverviewProps {
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

export const GoalDetailOverview = ({ goal }: GoalDetailOverviewProps) => {
  const { completions, toggleCompletion, isToggling } = useHabitCompletions();
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');

  const getTargetDateDisplay = () => {
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      return targetDate.toLocaleDateString();
    }
    return goal.timeframe;
  };

  const habitItems = goal.habit_items || [];
  const hasHabits = habitItems.length > 0;

  const isHabitCompletedToday = (habitItemId: string) => {
    return completions.some(
      c => c.habit_item_id === habitItemId && c.completion_date === todayKey
    );
  };

  const handleToggleHabit = (habitItemId: string) => {
    toggleCompletion(goal.id, habitItemId, today);
  };

  return (
    <div className="space-y-6">
      {/* Habit Items */}
      {hasHabits && (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Habits ({habitItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60 text-xs mb-3">Check off today's habits</p>
            <div className="space-y-3">
              {habitItems.map((habit) => {
                const isCompleted = isHabitCompletedToday(habit.id);
                return (
                  <div 
                    key={habit.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isCompleted 
                        ? 'bg-emerald-500/20 border-emerald-500/30' 
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => handleToggleHabit(habit.id)}
                        disabled={isToggling}
                        className={`border-white/40 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 ${
                          isToggling ? 'opacity-50' : ''
                        }`}
                      />
                      <span className={`font-medium transition-all ${
                        isCompleted ? 'text-white/60 line-through' : 'text-white/90'
                      }`}>
                        {habit.text}
                      </span>
                    </div>
                    <Badge variant="outline" className="bg-white/10 text-white/80 border-white/20">
                      {frequencyLabels[habit.frequency] || habit.frequency}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      {goal.description && (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/80 leading-relaxed">{goal.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-3 w-3 text-white/60" />
                <span className="text-white/80 text-sm">{getTargetDateDisplay()}</span>
              </div>
              <div className="text-xs text-white/60">
                Created {formatRelativeTime(new Date(goal.created_at).getTime())}
              </div>
              {goal.completed_at && (
                <div className="text-xs text-white/60">
                  Completed {formatRelativeTime(new Date(goal.completed_at).getTime())}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {goal.category && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="bg-white/20 text-white">
                {goal.category}
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notes */}
      {goal.notes && (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-white/80 leading-relaxed whitespace-pre-wrap">
              {goal.notes}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

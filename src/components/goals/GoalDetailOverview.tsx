import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Goal } from "@/types/goals";
import { formatRelativeTime } from "@/utils/dateUtils";
import { Calendar, Tag, StickyNote, Target } from "lucide-react";

interface GoalDetailOverviewProps {
  goal: Goal;
}

export const GoalDetailOverview = ({ goal }: GoalDetailOverviewProps) => {
  const getTargetDateDisplay = () => {
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      return targetDate.toLocaleDateString();
    }
    return goal.timeframe;
  };

  return (
    <div className="space-y-6">
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
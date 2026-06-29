import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Play, CheckCircle, Target, Calendar, ListChecks, MessageCircle } from "lucide-react";
import { PartnerGoal } from "@/services/accountabilityService";
import { format } from "date-fns";
import { getCategoryConfig, CustomCategoryIcon } from "@/types/customCategories";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GoalCommentsSheet } from "./GoalCommentsSheet";
import { useGoalCommentCounts } from "@/hooks/useGoalComments";
import { KanbanBoard, type KanbanColumnDef } from "@/components/kanban/KanbanBoard";

interface PartnerGoalWithCounts extends PartnerGoal {
  objectives_count?: number;
  completed_objectives_count?: number;
}

interface PartnerGoalsKanbanProps {
  goals: PartnerGoalWithCounts[];
}

type GoalStatus = 'not_started' | 'in_progress' | 'completed';

const COLUMNS: KanbanColumnDef<GoalStatus>[] = [
  {
    id: "not_started",
    title: "Not Started",
    icon: Clock,
    accentDot: "bg-muted-foreground/50",
    emptyMessage: "No not started goals",
  },
  {
    id: "in_progress",
    title: "In Progress",
    icon: Play,
    accentDot: "bg-amber-500",
    emptyMessage: "No in progress goals",
  },
  {
    id: "completed",
    title: "Completed",
    icon: CheckCircle,
    accentDot: "bg-emerald-500",
    emptyMessage: "No completed goals",
  },
];

const PartnerGoalCard = ({
  goal,
  commentCount,
  onCommentClick,
}: {
  goal: PartnerGoalWithCounts;
  commentCount: number;
  onCommentClick: () => void;
}) => {
  const categoryConfig = goal.category ? getCategoryConfig(goal.category) : null;
  const CategoryIcon = categoryConfig?.icon || CustomCategoryIcon;
  const objectivesCount = goal.objectives_count ?? 0;
  const completedCount = goal.completed_objectives_count ?? 0;
  const progressPercentage = objectivesCount > 0 ? Math.round((completedCount / objectivesCount) * 100) : 0;

  return (
    <Card className="p-3 sm:p-4 bg-background hover:shadow-md transition-shadow">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm text-foreground line-clamp-2">
            {goal.title}
          </h4>
          {objectivesCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-xs px-1.5 py-0 flex-shrink-0 cursor-help">
                  <ListChecks className="h-3 w-3 mr-1" />
                  {completedCount}/{objectivesCount}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{completedCount} of {objectivesCount} objectives completed ({progressPercentage}%)</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {goal.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {goal.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {goal.category && (
            <div className="flex items-center gap-1">
              <CategoryIcon className="h-3 w-3" />
              <span>{goal.category}</span>
            </div>
          )}
          {goal.target_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
            </div>
          )}
          {goal.is_recurring && (
            <Badge variant="outline" className="text-xs">
              Recurring
            </Badge>
          )}
        </div>

        {/* Comment / encouragement button */}
        <div className="pt-1 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCommentClick}
            className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {commentCount > 0 ? commentCount : 'Encourage'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export const PartnerGoalsKanban = ({ goals }: PartnerGoalsKanbanProps) => {
  const [commentsGoalId, setCommentsGoalId] = useState<string | null>(null);
  const [commentsGoalTitle, setCommentsGoalTitle] = useState('');

  const goalIds = goals.map((g) => g.id);
  const commentCounts = useGoalCommentCounts(goalIds);

  const totalGoals = goals.length;

  if (totalGoals === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No active goals at the moment.</p>
      </div>
    );
  }

  return (
    <>
      <KanbanBoard<PartnerGoalWithCounts, GoalStatus>
        readOnly
        columns={COLUMNS}
        items={goals}
        getId={(g) => g.id}
        getStatus={(g) => g.status as GoalStatus}
        renderCard={(goal) => (
          <PartnerGoalCard
            goal={goal}
            commentCount={commentCounts[goal.id] ?? 0}
            onCommentClick={() => {
              setCommentsGoalId(goal.id);
              setCommentsGoalTitle(goal.title);
            }}
          />
        )}
      />



      {commentsGoalId && (
        <GoalCommentsSheet
          open={!!commentsGoalId}
          onOpenChange={(open) => { if (!open) setCommentsGoalId(null); }}
          goalId={commentsGoalId}
          goalTitle={commentsGoalTitle}
        />
      )}
    </>
  );
};


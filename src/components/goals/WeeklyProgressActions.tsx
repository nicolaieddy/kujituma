
import { Button } from "@/components/ui/button";
import { CheckCircle, Edit } from "lucide-react";

interface WeeklyProgressActionsProps {
  isWeekCompleted: boolean;
  weekNumber: number;
  isSavingNotes: boolean;
  isCompletingWeek: boolean;
  isUncompletingWeek: boolean;
  onSaveNotes: () => void;
  onCompleteWeek: () => void;
  onEditWeek: () => void;
}

export const WeeklyProgressActions = ({
  isWeekCompleted,
  weekNumber,
  isSavingNotes,
  isCompletingWeek,
  isUncompletingWeek,
  onSaveNotes,
  onCompleteWeek,
  onEditWeek,
}: WeeklyProgressActionsProps) => {
  return (
    <div className="flex justify-center">
      {isWeekCompleted ? (
        <Button
          onClick={onEditWeek}
          disabled={isUncompletingWeek}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-8"
        >
          <Edit className="h-4 w-4 mr-2" />
          {isUncompletingWeek ? "Reopening..." : "Edit Week"}
        </Button>
      ) : (
        <div className="flex gap-4">
          <Button
            onClick={onSaveNotes}
            disabled={isSavingNotes}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 bg-transparent px-6"
          >
            {isSavingNotes ? "Saving..." : "Save Progress"}
          </Button>
          <Button
            onClick={onCompleteWeek}
            disabled={isCompletingWeek}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 px-6"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isCompletingWeek ? "Completing..." : `Complete Week ${weekNumber}`}
          </Button>
        </div>
      )}
    </div>
  );
};


import { Button } from "@/components/ui/button";
import { CheckCircle, Edit, Save, Share } from "lucide-react";

interface WeeklyProgressActionsProps {
  isWeekCompleted: boolean;
  weekNumber: number;
  isSavingNotes: boolean;
  isCompletingWeek: boolean;
  isUncompletingWeek: boolean;
  onSaveNotes: () => void;
  onPostToFeed: () => void;
  onEditWeek: () => void;
}

export const WeeklyProgressActions = ({
  isWeekCompleted,
  weekNumber,
  isSavingNotes,
  isCompletingWeek,
  isUncompletingWeek,
  onSaveNotes,
  onPostToFeed,
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
            <Save className="h-4 w-4 mr-2" />
            {isSavingNotes ? "Saving..." : "Save Progress"}
          </Button>
          <Button
            onClick={onPostToFeed}
            disabled={isCompletingWeek}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-6"
          >
            <Share className="h-4 w-4 mr-2" />
            {isCompletingWeek ? "Posting..." : `Post Week ${weekNumber} to Feed`}
          </Button>
        </div>
      )}
    </div>
  );
};

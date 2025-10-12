
import { Button } from "@/components/ui/button";
import { CheckCircle, Edit, Save, Share, ExternalLink, Check } from "lucide-react";
import { UnifiedPost } from "@/services/unifiedPostsService";

interface WeeklyProgressActionsProps {
  isWeekCompleted: boolean;
  weekNumber: number;
  isSavingNotes: boolean;
  isCompletingWeek: boolean;
  isUncompletingWeek: boolean;
  feedPost?: UnifiedPost | null;
  onSaveNotes: () => void;
  onPostToFeed: () => void;
  onEditWeek: () => void;
  onViewPost?: () => void;
}

export const WeeklyProgressActions = ({
  isWeekCompleted,
  weekNumber,
  isSavingNotes,
  isCompletingWeek,
  isUncompletingWeek,
  feedPost,
  onSaveNotes,
  onPostToFeed,
  onEditWeek,
  onViewPost,
}: WeeklyProgressActionsProps) => {
  return (
    <div className="flex justify-center">
      {isWeekCompleted ? (
        <div className="flex gap-4 items-center">
          <Button
            onClick={onEditWeek}
            disabled={isUncompletingWeek}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-8"
          >
            <Edit className="h-4 w-4 mr-2" />
            {isUncompletingWeek ? "Reopening..." : "Edit Week"}
          </Button>
          
          {feedPost && onViewPost && (
            <Button
              onClick={onViewPost}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 bg-transparent px-6"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Feed Post
            </Button>
          )}
        </div>
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
          
          {feedPost ? (
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Check className="h-4 w-4" />
                <span>Posted to Feed</span>
              </div>
              {onViewPost && (
                <Button
                  onClick={onViewPost}
                  variant="outline"
                  className="border-green-400/30 text-green-400 hover:bg-green-400/10 bg-transparent px-6"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Post
                </Button>
              )}
            </div>
          ) : (
            <Button
              onClick={onPostToFeed}
              disabled={isCompletingWeek}
              className="gradient-primary shadow-elegant hover:shadow-lift px-6"
            >
              <Share className="h-4 w-4 mr-2" />
              {isCompletingWeek ? "Posting..." : `Post Week ${weekNumber} to Feed`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

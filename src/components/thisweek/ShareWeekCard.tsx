import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { UnifiedPost } from "@/services/unifiedPostsService";
import { SharedPostPreview } from "./SharedPostPreview";

interface ShareWeekCardProps {
  hasShared: boolean;
  isCurrentWeek: boolean;
  isSharing: boolean;
  feedPost: UnifiedPost | null;
  objectives: any[];
  reflectionValue: string;
  onShareWeek: () => void;
  onViewInCommunity: () => void;
  isWeekCompleted?: boolean;
}

export const ShareWeekCard = ({
  hasShared,
  isCurrentWeek,
  isSharing,
  feedPost,
  objectives,
  reflectionValue,
  onShareWeek,
  onViewInCommunity,
  isWeekCompleted = false
}: ShareWeekCardProps) => {
  return (
    <>
      {/* Shared Post Preview */}
      {hasShared && feedPost && (
        <SharedPostPreview 
          post={feedPost} 
          onViewInCommunity={onViewInCommunity}
        />
      )}

      {/* Share Week */}
      <Card className="border-border">
        <CardContent className="pt-6">
          {hasShared ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <p className="text-foreground text-lg font-medium">
                Week Shared & Locked
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                {isWeekCompleted 
                  ? "This week has been posted and is now permanent. Objectives and reflection are locked."
                  : "This week's progress was shared with the community."
                }
              </p>
              <div className="flex gap-2 mt-3 justify-center">
                <Button
                  onClick={onViewInCommunity}
                  variant="outline"
                >
                  View in Community
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-foreground mb-2">
                Ready to share your week's progress with the community?
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                Your objectives{reflectionValue.trim() ? ' and weekly reflection' : ''} will be shared as a post
              </p>
              <Button
                onClick={onShareWeek}
                disabled={isSharing || (objectives?.length === 0 && !reflectionValue.trim())}
              >
                {isSharing ? "Sharing..." : "Share This Week"}
              </Button>
              {objectives?.length === 0 && !reflectionValue.trim() && (
                <p className="text-muted-foreground text-xs mt-2">
                  Add some objectives or a reflection to share your week
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
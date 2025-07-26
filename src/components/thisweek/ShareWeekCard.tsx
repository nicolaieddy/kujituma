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
}

export const ShareWeekCard = ({
  hasShared,
  isCurrentWeek,
  isSharing,
  feedPost,
  objectives,
  reflectionValue,
  onShareWeek,
  onViewInCommunity
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
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="pt-6">
          {hasShared ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="text-white text-lg font-medium">
                {isCurrentWeek ? "Week Shared!" : "Week Previously Shared"}
              </p>
              <p className="text-white/60 text-sm mt-1">
                {isCurrentWeek 
                  ? "Your progress has been shared. You can continue editing and re-share updates."
                  : "This week's progress was shared with the community."
                }
              </p>
              <div className="flex gap-2 mt-3 justify-center">
                <Button
                  onClick={onViewInCommunity}
                  variant="glass-outline"
                >
                  View in Community
                </Button>
                {isCurrentWeek && (
                  <Button
                    onClick={onShareWeek}
                    disabled={isSharing}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                  >
                    {isSharing ? "Updating..." : "Share Updates"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-white/80 mb-2">
                Ready to share your week's progress with the community?
              </p>
              <p className="text-white/60 text-sm mb-4">
                Your objectives{reflectionValue.trim() ? ' and weekly reflection' : ''} will be shared as a post
              </p>
              <Button
                onClick={onShareWeek}
                disabled={isSharing || (objectives?.length === 0 && !reflectionValue.trim())}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                {isSharing ? "Sharing..." : "Share This Week"}
              </Button>
              {objectives?.length === 0 && !reflectionValue.trim() && (
                <p className="text-white/40 text-xs mt-2">
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
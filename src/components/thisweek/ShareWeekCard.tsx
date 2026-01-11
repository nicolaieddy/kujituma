import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Lock, Share2 } from "lucide-react";
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
  onCloseWeek?: () => void;
  onCarryOverIncomplete?: () => void;
  incompleteCount?: number;
  isWeekCompleted?: boolean;
  isClosingWeek?: boolean;
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
  onCloseWeek,
  onCarryOverIncomplete,
  incompleteCount = 0,
  isWeekCompleted = false,
  isClosingWeek = false
}: ShareWeekCardProps) => {
  const hasContent = objectives?.length > 0 || reflectionValue.trim();
  
  return (
    <>
      {/* Shared Post Preview */}
      {hasShared && feedPost && (
        <SharedPostPreview 
          post={feedPost} 
          onViewInCommunity={onViewInCommunity}
        />
      )}

      {/* Share/Close Week Card */}
      <Card className="border-border">
        <CardContent className="pt-6">
          {isWeekCompleted ? (
            // Week is closed state
            <div className="text-center py-4">
              <Lock className="h-12 w-12 text-primary mx-auto mb-3" />
              <p className="text-foreground text-lg font-medium">
                Week Closed
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                {hasShared 
                  ? "This week has been closed and shared with the community."
                  : "This week is complete. Objectives and reflection are locked."
                }
              </p>
              <div className="flex gap-2 mt-4 justify-center flex-wrap">
                {incompleteCount > 0 && onCarryOverIncomplete && (
                  <Button
                    onClick={onCarryOverIncomplete}
                    variant="default"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Carry Over {incompleteCount} Incomplete
                  </Button>
                )}
                {hasShared ? (
                  <Button
                    onClick={onViewInCommunity}
                    variant="outline"
                  >
                    View in Community
                  </Button>
                ) : (
                  <Button
                    onClick={onShareWeek}
                    disabled={isSharing || !hasContent}
                    variant="outline"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    {isSharing ? "Sharing..." : "Share to Community"}
                  </Button>
                )}
              </div>
            </div>
          ) : hasShared ? (
            // Legacy: Week shared but not closed (from old flow)
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <p className="text-foreground text-lg font-medium">
                Week Shared
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Your progress was shared with the community.
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
            // Open week - show close/share options
            <div className="text-center py-4">
              <p className="text-foreground font-medium mb-2">
                Ready to wrap up this week?
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                Close your week to lock in progress and carry over incomplete objectives.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {onCloseWeek && (
                  <Button
                    onClick={onCloseWeek}
                    disabled={isClosingWeek || objectives?.length === 0}
                    variant="outline"
                    className="flex-1 sm:flex-none"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    {isClosingWeek ? "Closing..." : "Close Week"}
                  </Button>
                )}
                <Button
                  onClick={onShareWeek}
                  disabled={isSharing || !hasContent}
                  className="flex-1 sm:flex-none"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {isSharing ? "Sharing..." : "Share & Close"}
                </Button>
              </div>
              
              {objectives?.length === 0 && !reflectionValue.trim() && (
                <p className="text-muted-foreground text-xs mt-3">
                  Add some objectives or a reflection to close your week
                </p>
              )}
              
              <p className="text-muted-foreground text-xs mt-3">
                <span className="font-medium">Close Week</span> locks privately • <span className="font-medium">Share & Close</span> posts to community
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

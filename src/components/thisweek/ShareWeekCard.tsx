import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock } from "lucide-react";

interface ShareWeekCardProps {
  hasShared?: boolean;
  isCurrentWeek: boolean;
  isSharing?: boolean;
  feedPost?: unknown;
  objectives: any[];
  reflectionValue: string;
  onShareWeek?: () => void;
  onViewInCommunity?: () => void;
  onCloseWeek?: () => void;
  onCarryOverIncomplete?: () => void;
  incompleteCount?: number;
  isWeekCompleted?: boolean;
  isClosingWeek?: boolean;
}

export const ShareWeekCard = ({
  isCurrentWeek,
  objectives,
  reflectionValue,
  onCloseWeek,
  onCarryOverIncomplete,
  incompleteCount = 0,
  isWeekCompleted = false,
  isClosingWeek = false
}: ShareWeekCardProps) => {
  
  return (
    <Card className="border-border">
      <CardContent className="pt-6">
        {isWeekCompleted ? (
          <div className="text-center py-4">
            <Lock className="h-12 w-12 text-primary mx-auto mb-3" />
            <p className="text-foreground text-lg font-medium">
              Week Closed
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              This week is complete. Objectives and reflection are locked.
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
            </div>
          </div>
        ) : (
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
                  variant="default"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {isClosingWeek ? "Closing..." : "Close Week"}
                </Button>
              )}
            </div>
            
            {objectives?.length === 0 && !reflectionValue.trim() && (
              <p className="text-muted-foreground text-xs mt-3">
                Add some objectives or a reflection to close your week
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

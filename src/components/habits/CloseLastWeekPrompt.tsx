import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWeeklyProgress } from "@/hooks/useWeeklyProgress";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { CheckCircle, Circle, ArrowRight, Share2, Loader2 } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";

interface CloseLastWeekPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceedToPlanning: () => void;
  onOpenLastWeekProgress: () => void;
  lastWeekStart: string;
}

export const CloseLastWeekPrompt = ({ 
  open, 
  onOpenChange, 
  onProceedToPlanning,
  onOpenLastWeekProgress,
  lastWeekStart 
}: CloseLastWeekPromptProps) => {
  const isMobile = useIsMobile();
  const { objectives, progressPost, feedPost, isLoading } = useWeeklyProgress(lastWeekStart);
  
  const completedCount = objectives.filter(o => o.is_completed).length;
  const totalCount = objectives.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  const lastWeekRange = WeeklyProgressService.formatWeekRange(lastWeekStart);
  const isWeekClosed = progressPost?.is_completed || false;
  const isWeekShared = !!feedPost;

  const handleSkipAndPlan = () => {
    onOpenChange(false);
    onProceedToPlanning();
  };

  const handleCloseWeekFirst = () => {
    onOpenChange(false);
    onOpenLastWeekProgress();
  };

  const content = (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Last Week Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Week ({lastWeekRange})</span>
              <Badge variant={completionPercentage >= 80 ? "default" : "secondary"}>
                {completionPercentage}% complete
              </Badge>
            </div>
            
            {/* Objectives preview */}
            {totalCount > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Your objectives:</p>
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                  {objectives.slice(0, 5).map((obj) => (
                    <div key={obj.id} className="flex items-center gap-2 text-sm">
                      {obj.is_completed ? (
                        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={obj.is_completed ? "line-through text-muted-foreground" : ""}>
                        {obj.text}
                      </span>
                    </div>
                  ))}
                  {totalCount > 5 && (
                    <p className="text-xs text-muted-foreground pl-6">
                      +{totalCount - 5} more objectives
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {totalCount === 0 && (
              <p className="text-sm text-muted-foreground">
                No objectives were set for last week.
              </p>
            )}
          </div>

          {/* Status indicators */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={isWeekClosed ? "default" : "outline"} className="text-xs">
              {isWeekClosed ? "✓ Week Closed" : "Week Not Closed"}
            </Badge>
            <Badge variant={isWeekShared ? "default" : "outline"} className="text-xs">
              {isWeekShared ? "✓ Shared" : "Not Shared"}
            </Badge>
          </div>

          {/* Recommendation */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-sm">
              {!isWeekClosed ? (
                <>
                  <span className="font-medium">Recommended:</span> Close last week first to reflect on what worked and what didn't before planning your new week.
                </>
              ) : !isWeekShared ? (
                <>
                  <span className="font-medium">Optional:</span> Share your progress with the community before starting your new week!
                </>
              ) : (
                <>
                  <span className="font-medium">Great job!</span> Last week is closed and shared. You're ready to plan!
                </>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );

  const footer = (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      {!isWeekClosed ? (
        <>
          <Button variant="outline" onClick={handleSkipAndPlan} className="flex-1">
            Skip & Plan Anyway
          </Button>
          <Button onClick={handleCloseWeekFirst} className="flex-1">
            <Share2 className="h-4 w-4 mr-2" />
            Close Last Week First
          </Button>
        </>
      ) : (
        <>
          {!isWeekShared && (
            <Button variant="outline" onClick={handleCloseWeekFirst} className="flex-1">
              <Share2 className="h-4 w-4 mr-2" />
              Share Last Week
            </Button>
          )}
          <Button onClick={handleSkipAndPlan} className="flex-1">
            Continue to Planning
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Before You Plan This Week...</DrawerTitle>
            <DrawerDescription>
              Let's take a moment to close out last week
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto flex-1 pb-4">
            {content}
          </div>
          <DrawerFooter className="pt-2">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Before You Plan This Week...</DialogTitle>
          <DialogDescription>
            Let's take a moment to close out last week
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {content}
        </div>
        <DialogFooter>
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

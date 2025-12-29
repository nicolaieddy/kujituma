import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, AlertCircle, Lightbulb, Rocket, CheckCircle, Clock, ClipboardList } from "lucide-react";
import { format } from "date-fns";

const quarterNames = ['', 'Q1', 'Q2', 'Q3', 'Q4'];
const quarterFullNames = ['', 'January - March', 'April - June', 'July - September', 'October - December'];

interface QuarterlyReview {
  id: string;
  year: number;
  quarter: number;
  quarter_start: string;
  is_completed: boolean;
  wins: string | null;
  challenges: string | null;
  lessons_learned: string | null;
  next_quarter_focus: string | null;
  goals_review: any | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface QuarterlyReviewDetailModalProps {
  review: QuarterlyReview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuarterlyReviewDetailModal = ({ review, open, onOpenChange }: QuarterlyReviewDetailModalProps) => {
  if (!review) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-purple-500" />
              {quarterNames[review.quarter]} {review.year} Review
            </DialogTitle>
            <Badge variant={review.is_completed ? "default" : "secondary"}>
              {review.is_completed ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Completed</>
              ) : (
                <><Clock className="h-3 w-3 mr-1" /> Draft</>
              )}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-sm">{quarterFullNames[review.quarter]}</span>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Wins */}
            {review.wins && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Wins & Accomplishments
                </div>
                <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                  {review.wins}
                </p>
              </div>
            )}

            {/* Challenges */}
            {review.challenges && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Challenges Faced
                  </div>
                  <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                    {review.challenges}
                  </p>
                </div>
              </>
            )}

            {/* Lessons Learned */}
            {review.lessons_learned && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Lightbulb className="h-4 w-4 text-blue-500" />
                    Lessons Learned
                  </div>
                  <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                    {review.lessons_learned}
                  </p>
                </div>
              </>
            )}

            {/* Next Quarter Focus */}
            {review.next_quarter_focus && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Rocket className="h-4 w-4 text-primary" />
                    Next Quarter Focus
                  </div>
                  <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                    {review.next_quarter_focus}
                  </p>
                </div>
              </>
            )}

            {/* Completion info */}
            {review.completed_at && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground text-center">
                  Completed on {format(new Date(review.completed_at), 'MMMM d, yyyy \'at\' h:mm a')}
                </p>
              </>
            )}

            {/* No content message */}
            {!review.wins && !review.challenges && !review.lessons_learned && !review.next_quarter_focus && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No details recorded for this quarterly review.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

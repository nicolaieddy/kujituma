import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ThumbsUp, HelpCircle, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeedbackType, ObjectiveFeedback } from "@/hooks/useObjectiveFeedback";

interface FeedbackCommentPopoverProps {
  objectiveId: string;
  feedback: ObjectiveFeedback | undefined;
  onSubmitFeedback: (feedbackType: FeedbackType) => void;
  onRemoveFeedback: () => void;
  isSubmitting: boolean;
  commentCount?: number;
  onOpenComments?: () => void;
}

export const FeedbackCommentPopover = ({
  objectiveId,
  feedback,
  onSubmitFeedback,
  onRemoveFeedback,
  isSubmitting,
  commentCount = 0,
  onOpenComments,
}: FeedbackCommentPopoverProps) => {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [pendingRemoveType, setPendingRemoveType] = useState<FeedbackType | null>(null);

  const isAgree = feedback?.feedback_type === 'agree';
  const isQuestion = feedback?.feedback_type === 'question';

  const handleButtonClick = (type: FeedbackType) => {
    if (feedback?.feedback_type === type) {
      setPendingRemoveType(type);
      setShowRemoveConfirm(true);
    } else {
      onSubmitFeedback(type);
    }
  };

  const handleConfirmRemove = () => {
    onRemoveFeedback();
    setShowRemoveConfirm(false);
    setPendingRemoveType(null);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 w-7 p-0 transition-all",
          isAgree 
            ? "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 hover:text-emerald-600" 
            : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
        )}
        onClick={() => handleButtonClick('agree')}
        disabled={isSubmitting}
      >
        <ThumbsUp className={cn("h-4 w-4", isAgree && "fill-current")} />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 w-7 p-0 transition-all",
          isQuestion 
            ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 hover:text-amber-600" 
            : "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
        )}
        onClick={() => handleButtonClick('question')}
        disabled={isSubmitting}
      >
        <HelpCircle className={cn("h-4 w-4", isQuestion && "fill-current")} />
      </Button>

      {onOpenComments && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenComments}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
        >
          <MessageCircle className="h-3 w-3" />
          {commentCount > 0 ? `${commentCount}` : 'Chat'}
        </Button>
      )}

      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your {pendingRemoveType === 'agree' ? 'agreement' : 'question'} from this objective? Your partner will no longer see this feedback.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

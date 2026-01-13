import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThumbsUp, HelpCircle, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeedbackType, ObjectiveFeedback } from "@/hooks/useObjectiveFeedback";

interface FeedbackCommentPopoverProps {
  objectiveId: string;
  feedback: ObjectiveFeedback | undefined;
  onSubmitFeedback: (feedbackType: FeedbackType, comment?: string) => void;
  onRemoveFeedback: () => void;
  isSubmitting: boolean;
}

export const FeedbackCommentPopover = ({
  objectiveId,
  feedback,
  onSubmitFeedback,
  onRemoveFeedback,
  isSubmitting,
}: FeedbackCommentPopoverProps) => {
  const [comment, setComment] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeType, setActiveType] = useState<FeedbackType | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isAgree = feedback?.feedback_type === 'agree';
  const isQuestion = feedback?.feedback_type === 'question';

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    // Initialize comment from existing feedback when popover opens
    if (isOpen && feedback?.comment) {
      setComment(feedback.comment);
    }
  }, [isOpen, feedback?.comment]);

  const handleButtonClick = (type: FeedbackType) => {
    if (feedback?.feedback_type === type) {
      // Already has this feedback - remove it
      onRemoveFeedback();
      setIsOpen(false);
    } else {
      // Immediately submit the feedback (without comment)
      onSubmitFeedback(type, undefined);
      // Then open popover for optional comment
      setActiveType(type);
      setComment("");
      setIsOpen(true);
    }
  };

  const handleAddComment = () => {
    if (activeType && comment.trim()) {
      onSubmitFeedback(activeType, comment.trim());
    }
    setComment("");
    setIsOpen(false);
    setActiveType(null);
  };

  const handleClose = () => {
    setComment("");
    setIsOpen(false);
    setActiveType(null);
  };

  return (
    <div className="flex items-center gap-1">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-1">
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 w-7 p-0 transition-all",
                isAgree 
                  ? "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 hover:text-emerald-600" 
                  : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
              )}
              onClick={(e) => {
                e.preventDefault();
                handleButtonClick('agree');
              }}
              disabled={isSubmitting}
            >
              <ThumbsUp className={cn("h-4 w-4", isAgree && "fill-current")} />
            </Button>
          </PopoverTrigger>
          
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 w-7 p-0 transition-all",
                isQuestion 
                  ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 hover:text-amber-600" 
                  : "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
              )}
              onClick={(e) => {
                e.preventDefault();
                handleButtonClick('question');
              }}
              disabled={isSubmitting}
            >
              <HelpCircle className={cn("h-4 w-4", isQuestion && "fill-current")} />
            </Button>
          </PopoverTrigger>
        </div>

        <PopoverContent 
          className="w-72 p-3" 
          align="end"
          side="top"
          sideOffset={8}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {activeType === 'agree' ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <ThumbsUp className="h-4 w-4 fill-current" />
                  <span className="text-sm font-medium">Add a note?</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600">
                  <HelpCircle className="h-4 w-4 fill-current" />
                  <span className="text-sm font-medium">Add a note?</span>
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto h-6 w-6 p-0"
                onClick={handleClose}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            <Textarea
              ref={textareaRef}
              placeholder={
                activeType === 'agree' 
                  ? "Why do you agree? (optional)" 
                  : "Why do you question this? (optional)"
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[60px] resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) {
                  handleAddComment();
                }
              }}
            />
            
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-muted-foreground text-xs"
              >
                Skip
              </Button>
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={isSubmitting || !comment.trim()}
                className="gap-1.5"
              >
                <Send className="h-3 w-3" />
                Add note
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Show existing comment indicator */}
      {feedback?.comment && (
        <span className="text-xs text-muted-foreground italic truncate max-w-[80px]" title={feedback.comment}>
          "{feedback.comment.slice(0, 15)}{feedback.comment.length > 15 ? '...' : ''}"
        </span>
      )}
    </div>
  );
};

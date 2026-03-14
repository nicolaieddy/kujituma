import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle } from "lucide-react";
import { useObjectiveComments } from "@/hooks/useObjectiveComments";

import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ObjectiveCommentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveId: string | null;
  objectiveText: string;
}

export const ObjectiveCommentsSheet = ({
  open,
  onOpenChange,
  objectiveId,
  objectiveText,
}: ObjectiveCommentsSheetProps) => {
  const { user } = useAuth();
  const { comments, isLoading, addComment, isAdding, markAsRead } = useObjectiveComments(open ? objectiveId : null);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mark as read when sheet opens and has comments
  useEffect(() => {
    if (open && objectiveId && comments.length > 0) {
      markAsRead();
    }
  }, [open, objectiveId, comments.length]);

  // Scroll to bottom when comments change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    addComment({ message: newMessage.trim() });
    setNewMessage("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 sm:max-w-md">
        <SheetHeader className="p-4 pb-3 border-b border-border">
          <SheetTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            Comments
          </SheetTitle>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {objectiveText}
          </p>
        </SheetHeader>

        {/* Comments list */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="py-4 space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading comments...</p>
            ) : comments.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No comments yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Start the conversation about this objective
                </p>
              </div>
            ) : (
              comments.map((comment) => {
                const isMe = comment.user_id === user?.id;
                const initials = comment.user?.full_name
                  ?.split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || '?';
                const commentReactions = reactionsByComment[comment.id] || {};
                const hasReactions = Object.keys(commentReactions).length > 0;

                return (
                  <div
                    key={comment.id}
                    className={cn("flex gap-2.5 group relative", isMe && "flex-row-reverse")}
                  >
                    <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                      <AvatarImage src={comment.user?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn("max-w-[75%]", isMe && "text-right")}>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-medium text-foreground">
                          {isMe ? 'You' : comment.user?.full_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Message bubble + emoji picker trigger */}
                      <div className={cn("flex items-end gap-1.5", isMe && "flex-row-reverse")}>
                        <div
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm inline-block text-left",
                            isMe
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          )}
                        >
                          {comment.message}
                        </div>

                        {/* Emoji picker toggle button */}
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex-shrink-0 mb-0.5"
                          aria-label="React to comment"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setOpenEmojiPickerCommentId(
                              openEmojiPickerCommentId === comment.id ? null : comment.id
                            );
                          }}
                        >
                          <SmilePlus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Inline emoji picker (no portal, no Popover) */}
                      {openEmojiPickerCommentId === comment.id && (
                        <div
                          className={cn(
                            "flex gap-1 mt-1 p-1.5 rounded-lg border bg-popover shadow-md w-fit",
                            isMe && "ml-auto"
                          )}
                        >
                          {EMOJI_OPTIONS.map((emoji) => {
                            const isMine = commentReactions[emoji]?.isMine;
                            return (
                              <button
                                key={emoji}
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  toggleReaction({ commentId: comment.id, emoji });
                                  setOpenEmojiPickerCommentId(null);
                                }}
                                className={cn(
                                  "text-lg p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer",
                                  isMine && "bg-primary/10 ring-1 ring-primary/30"
                                )}
                                aria-label={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Reaction chips below the bubble */}
                      {hasReactions && (
                        <div className={cn("flex flex-wrap gap-1 mt-1", isMe && "justify-end")}>
                          {Object.entries(commentReactions).map(([emoji, { count, isMine }]) => (
                            <button
                              key={emoji}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                toggleReaction({ commentId: comment.id, emoji });
                              }}
                              className={cn(
                                "flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-colors cursor-pointer",
                                isMine
                                  ? "bg-primary/10 border-primary/30 text-primary"
                                  : "bg-muted border-border text-muted-foreground hover:border-primary/30"
                              )}
                            >
                              <span>{emoji}</span>
                              <span className="font-medium">{count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Textarea
              placeholder="Write a comment..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="min-h-[40px] h-10 resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!newMessage.trim() || isAdding}
              className="px-3 self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

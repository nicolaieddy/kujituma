import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { UnifiedComment } from "@/services/unifiedPostsService";
import { MentionInput } from "@/components/ui/mention-input";
import { MentionText } from "@/components/ui/mention-text";

interface CompactFeedPostCommentsProps {
  comments: UnifiedComment[];
  isCommenting: boolean;
  newComment: string;
  onCommentChange: (value: string) => void;
  onCommentSubmit: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onCommentLike?: (commentId: string) => void;
}

export const CompactFeedPostComments = ({
  comments,
  isCommenting,
  newComment,
  onCommentChange,
  onCommentSubmit,
  onKeyPress,
  onCommentLike
}: CompactFeedPostCommentsProps) => {
  const navigate = useNavigate();
  
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleProfileClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <>
      {/* Comments */}
      {comments.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2">
              <Avatar 
                className="h-6 w-6 cursor-pointer hover:ring-1 hover:ring-white/20 transition-all"
                onClick={() => handleProfileClick(comment.user_id)}
              >
                <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(comment.profiles?.full_name || comment.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="bg-accent rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span 
                      className="text-foreground font-medium text-xs cursor-pointer hover:text-foreground/80 transition-colors truncate"
                      onClick={() => handleProfileClick(comment.user_id)}
                    >
                      {comment.profiles?.full_name || comment.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <MentionText text={comment.message} className="text-foreground/80 text-xs" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Comment */}
      {isCommenting && (
        <div className="pt-2 border-t border-border space-y-2">
          <div className="relative">
            <MentionInput
              value={newComment}
              onChange={onCommentChange}
              placeholder="Write a comment... Use @ to mention someone"
              className="w-full resize-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-sm"
              onKeyPress={onKeyPress}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              💡 Type @ to mention someone
            </div>
            <Button
              onClick={onCommentSubmit}
              disabled={!newComment.trim()}
              size="sm"
              className="bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 text-xs h-6"
            >
              <Send className="h-3 w-3 mr-1" />
              Post
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
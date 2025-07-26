import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { UnifiedComment } from "@/services/unifiedPostsService";
import { MentionInput } from "@/components/ui/mention-input";
import { MentionText } from "@/components/ui/mention-text";

interface FeedPostCommentsProps {
  comments: UnifiedComment[];
  isCommenting: boolean;
  newComment: string;
  onCommentChange: (value: string) => void;
  onCommentSubmit: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onCommentLike?: (commentId: string) => void;
}

export const FeedPostComments = ({
  comments,
  isCommenting,
  newComment,
  onCommentChange,
  onCommentSubmit,
  onKeyPress,
  onCommentLike
}: FeedPostCommentsProps) => {
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
        <div className="space-y-3 pt-4 border-t border-white/10">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-3">
              <Avatar 
                className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-white/20 transition-all"
                onClick={() => handleProfileClick(comment.user_id)}
              >
                <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                <AvatarFallback className="bg-purple-500 text-white text-xs">
                  {getInitials(comment.profiles?.full_name || comment.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="text-white font-medium text-sm cursor-pointer hover:text-white/80 transition-colors"
                      onClick={() => handleProfileClick(comment.user_id)}
                    >
                      {comment.profiles?.full_name || comment.name}
                    </span>
                    <span className="text-white/40 text-xs">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <MentionText text={comment.message} className="text-white/80 text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Comment */}
      {isCommenting && (
        <div className="flex items-center gap-2 pt-4 border-t border-white/10">
          <MentionInput
            value={newComment}
            onChange={onCommentChange}
            placeholder="Write a comment... Use @ to mention someone"
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
            onKeyPress={onKeyPress}
          />
          <Button
            onClick={onCommentSubmit}
            disabled={!newComment.trim()}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
};
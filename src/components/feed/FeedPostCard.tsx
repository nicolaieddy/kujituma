import { useState, memo, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UnifiedPost } from "@/services/unifiedPostsService";
import { FeedPostHeader } from "./FeedPostHeader";
import { FeedPostContent } from "./FeedPostContent";
import { FeedPostPriorities } from "./FeedPostPriorities";
import { FeedPostHelp } from "./FeedPostHelp";
import { FeedPostActions } from "./FeedPostActions";
import { FeedPostComments } from "./FeedPostComments";

interface FeedPostCardProps {
  post: UnifiedPost;
  onLike: (postId: string) => void;
  onComment: (postId: string, message: string) => void;
  onCommentLike: (commentId: string) => void;
}

export const FeedPostCard = memo(({ post, onLike, onComment, onCommentLike }: FeedPostCardProps) => {
  const [isCommenting, setIsCommenting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isLiking, setIsLiking] = useState(false);

  // Use comments from post data instead of separate query
  const comments = post.comments || [];

  const handleLike = useCallback(async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      await onLike(post.id);
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  }, [isLiking, post.id, onLike]);

  const handleComment = useCallback(async () => {
    console.log('handleComment called with:', newComment);
    if (!newComment.trim()) {
      console.log('handleComment: empty comment, returning');
      return;
    }
    try {
      console.log('handleComment: posting comment for post:', post.id);
      await onComment(post.id, newComment.trim());
      setNewComment("");
      setIsCommenting(false);
      console.log('handleComment: success');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }, [newComment, post.id, onComment]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleComment();
    }
  }, [handleComment]);

  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:bg-white/[0.07] transition-all duration-300">
      <CardHeader className="pb-4">
        <FeedPostHeader post={post} />
      </CardHeader>

      <CardContent className="space-y-8 pt-0">
        <FeedPostContent post={post} />
        <FeedPostPriorities post={post} />
        <FeedPostHelp post={post} />
        
        <FeedPostActions
          post={post}
          commentsCount={comments.length}
          onLike={handleLike}
          onComment={() => setIsCommenting(!isCommenting)}
          isLiking={isLiking}
        />

        <FeedPostComments
          comments={comments}
          isCommenting={isCommenting}
          newComment={newComment}
          onCommentChange={setNewComment}
          onCommentSubmit={handleComment}
          onKeyPress={handleKeyPress}
          onCommentLike={onCommentLike}
        />
      </CardContent>
    </Card>
  );
});

FeedPostCard.displayName = 'FeedPostCard';
import { useState, memo, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UnifiedPost } from "@/services/unifiedPostsService";
import { CompactFeedPostHeader } from "./CompactFeedPostHeader";
import { CompactFeedPostContent } from "./CompactFeedPostContent";
import { CompactFeedPostActions } from "./CompactFeedPostActions";
import { CompactFeedPostComments } from "./CompactFeedPostComments";

interface CompactFeedPostCardProps {
  post: UnifiedPost;
  onLike: (postId: string) => void;
  onComment: (postId: string, message: string) => void;
  onCommentLike: (commentId: string) => void;
}

export const CompactFeedPostCard = memo(({ post, onLike, onComment, onCommentLike }: CompactFeedPostCardProps) => {
  const [isCommenting, setIsCommenting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isLiking, setIsLiking] = useState(false);

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
    if (!newComment.trim()) return;
    try {
      await onComment(post.id, newComment.trim());
      setNewComment("");
      setIsCommenting(false);
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
    <Card className="border-border/50 hover:border-primary/20 transition-all duration-300">
      <CardHeader className="pb-2 pt-3 px-4">
        <CompactFeedPostHeader post={post} />
      </CardHeader>

      <CardContent className="space-y-3 pt-0 px-4 pb-3">
        <CompactFeedPostContent post={post} />
        
        <CompactFeedPostActions
          post={post}
          commentsCount={comments.length}
          onLike={handleLike}
          onComment={() => setIsCommenting(!isCommenting)}
          isLiking={isLiking}
        />

        <CompactFeedPostComments
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

CompactFeedPostCard.displayName = 'CompactFeedPostCard';
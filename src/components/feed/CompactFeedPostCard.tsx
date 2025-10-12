import { useState, memo, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UnifiedPost } from "@/services/unifiedPostsService";
import { CompactFeedPostHeader } from "./CompactFeedPostHeader";
import { CompactFeedPostContent } from "./CompactFeedPostContent";
import { CompactFeedPostActions } from "./CompactFeedPostActions";
import { CompactFeedPostComments } from "./CompactFeedPostComments";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { hapticImpact } from "@/utils/haptic";

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

  // Swipe gesture for quick actions
  const { handlers, swipeDistance } = useSwipeGesture({
    onSwipeRight: () => {
      hapticImpact()
      handleLike()
    },
    onSwipeLeft: () => {
      hapticImpact()
      setIsCommenting(!isCommenting)
    },
    threshold: 80
  });

  const handleLike = useCallback(async () => {
    if (isLiking) return;
    hapticImpact();
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
    <Card 
      className="border-border/50 hover:border-primary/20 transition-all duration-300 relative overflow-hidden touch-pan-y"
      style={{
        transform: swipeDistance !== 0 ? `translateX(${swipeDistance * 0.2}px)` : 'none',
        transition: swipeDistance === 0 ? 'transform 0.3s ease-out' : 'none'
      }}
      {...handlers}
    >
      {/* Swipe hints */}
      {Math.abs(swipeDistance) > 20 && (
        <>
          {swipeDistance > 0 && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-70">
              ❤️ Like
            </div>
          )}
          {swipeDistance < 0 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary opacity-70">
              💬 Comment
            </div>
          )}
        </>
      )}
      
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
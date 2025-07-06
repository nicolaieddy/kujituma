import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { unifiedPostsService, UnifiedPost } from "@/services/unifiedPostsService";
import { EnhancedFeedPostHeader } from "./EnhancedFeedPostHeader";
import { EnhancedFeedPostContent } from "./EnhancedFeedPostContent";
import { FeedPostPriorities } from "./FeedPostPriorities";
import { FeedPostHelp } from "./FeedPostHelp";
import { FeedPostActions } from "./FeedPostActions";
import { FeedPostComments } from "./FeedPostComments";

interface EnhancedFeedPostCardProps {
  post: UnifiedPost;
  onUpdate: () => void;
}

export const EnhancedFeedPostCard = ({ post, onUpdate }: EnhancedFeedPostCardProps) => {
  const [isCommenting, setIsCommenting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isLiking, setIsLiking] = useState(false);

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['post-comments', post.id],
    queryFn: () => unifiedPostsService.getPostComments(post.id),
  });

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      await unifiedPostsService.togglePostLike(post.id);
      onUpdate();
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    try {
      await unifiedPostsService.addComment(post.id, newComment.trim());
      setNewComment("");
      setIsCommenting(false);
      refetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleComment();
    }
  };

  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10 hover:bg-white/[0.07] transition-all duration-300 shadow-xl">
      <CardHeader className="pb-4">
        <EnhancedFeedPostHeader post={post} />
      </CardHeader>

      <CardContent className="space-y-6 pt-0">
        <EnhancedFeedPostContent post={post} />
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
        />
      </CardContent>
    </Card>
  );
};
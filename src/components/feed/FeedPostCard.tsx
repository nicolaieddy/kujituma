import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FeedService, FeedPost } from "@/services/feedService";
import { FeedPostHeader } from "./FeedPostHeader";
import { FeedPostContent } from "./FeedPostContent";
import { FeedPostPriorities } from "./FeedPostPriorities";
import { FeedPostHelp } from "./FeedPostHelp";
import { FeedPostActions } from "./FeedPostActions";
import { FeedPostComments } from "./FeedPostComments";

interface FeedPostCardProps {
  post: FeedPost;
  onUpdate: () => void;
}

export const FeedPostCard = ({ post, onUpdate }: FeedPostCardProps) => {
  const [isCommenting, setIsCommenting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isLiking, setIsLiking] = useState(false);

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['post-comments', post.id],
    queryFn: () => FeedService.getPostComments(post.id),
  });

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      await FeedService.togglePostLike(post.id);
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
      await FeedService.addComment(post.id, newComment.trim());
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
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <FeedPostHeader post={post} />
      </CardHeader>

      <CardContent className="space-y-6">
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
        />
      </CardContent>
    </Card>
  );
};
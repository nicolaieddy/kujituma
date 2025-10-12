
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProgressPostType } from "@/types/progress";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProgressPostHeader } from "./progress/ProgressPostHeader";
import { ProgressPostContent } from "./progress/ProgressPostContent";
import { ProgressPostActions } from "./progress/ProgressPostActions";
import { ProgressPostComments } from "./progress/ProgressPostComments";

interface ProgressPostProps {
  post: ProgressPostType;
  onAddComment: (commentData: { name: string; message: string }) => void;
  onViewUserPosts: (userId: string) => void;
  onTogglePostLike: (postId: string) => void;
  onToggleCommentLike: (commentId: string) => void;
  isAuthenticated?: boolean;
}

const ProgressPost = ({ 
  post, 
  onAddComment, 
  onViewUserPosts, 
  onTogglePostLike,
  onToggleCommentLike,
  isAuthenticated = false 
}: ProgressPostProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCommentForm, setShowCommentForm] = useState(false);

  // Auto-populate name from authenticated user when component mounts
  const userName = user?.user_metadata?.full_name || user?.email || "";

  const handleCommentClick = () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    setShowCommentForm(!showCommentForm);
  };

  const handleViewUserHistory = () => {
    onViewUserPosts(post.user_id || post.id);
  };

  const handlePostLike = () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    onTogglePostLike(post.id);
  };

  const handleCommentLike = (commentId: string) => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    onToggleCommentLike(commentId);
  };

  const handleAddComment = (commentData: { name: string; message: string }) => {
    onAddComment(commentData);
    setShowCommentForm(false);
  };

  return (
    <Card className="border-border hover:bg-accent/50 transition-all duration-300">
      <CardHeader className="pb-1 px-3 pt-2">
        <div className="flex items-center justify-between">
          <ProgressPostHeader 
            post={post}
            onViewUserHistory={handleViewUserHistory}
          />
          <ProgressPostActions
            post={post}
            onPostLike={handlePostLike}
            onCommentClick={handleCommentClick}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-1 pt-0 px-3 pb-2">
        <ProgressPostContent post={post} />
        
        <ProgressPostComments
          post={post}
          showCommentForm={showCommentForm}
          isAuthenticated={isAuthenticated}
          userName={userName}
          onAddComment={handleAddComment}
          onCommentLike={handleCommentLike}
          onCloseCommentForm={() => setShowCommentForm(false)}
        />
      </CardContent>
    </Card>
  );
};

export default ProgressPost;

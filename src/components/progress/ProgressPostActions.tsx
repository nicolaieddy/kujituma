import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { ProgressPostType } from "@/types/progress";
import { PostReactions } from "@/components/feed/PostReactions";

interface ProgressPostActionsProps {
  post: ProgressPostType;
  onPostLike: () => void;
  onCommentClick: () => void;
  isAuthenticated: boolean;
}

export const ProgressPostActions = ({ 
  post, 
  onPostLike, 
  onCommentClick, 
  isAuthenticated 
}: ProgressPostActionsProps) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <PostReactions postId={post.id} />
      
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPostLike}
          className={`text-xs h-5 px-1 ${post.user_liked ? 'text-orange-400 hover:bg-orange-500/20' : 'text-muted-foreground hover:bg-accent'}`}
        >
          🚀 {post.likes || 0}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCommentClick}
          className="text-muted-foreground hover:bg-accent text-xs h-5 px-1"
        >
          <MessageCircle className="h-2 w-2 mr-1" />
          {post.comments.length > 0 ? `${post.comments.length}` : ''}
        </Button>
      </div>
    </div>
  );
};
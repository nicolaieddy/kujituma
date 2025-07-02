import { Button } from "@/components/ui/button";
import { Heart, MessageCircle } from "lucide-react";
import { UnifiedPost } from "@/services/unifiedPostsService";

interface FeedPostActionsProps {
  post: UnifiedPost;
  commentsCount: number;
  onLike: () => void;
  onComment: () => void;
  isLiking: boolean;
}

export const FeedPostActions = ({ 
  post, 
  commentsCount, 
  onLike, 
  onComment, 
  isLiking 
}: FeedPostActionsProps) => {
  return (
    <div className="flex items-center gap-4 pt-4 border-t border-white/10">
      <Button
        variant="ghost"
        size="sm"
        onClick={onLike}
        disabled={isLiking}
        className="text-white/60 hover:text-red-400 hover:bg-white/10"
      >
        <Heart className={`h-4 w-4 mr-2 ${isLiking ? 'animate-pulse' : ''}`} />
        {post.likes || 0}
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onComment}
        className="text-white/60 hover:text-blue-400 hover:bg-white/10"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        {commentsCount}
      </Button>
    </div>
  );
};
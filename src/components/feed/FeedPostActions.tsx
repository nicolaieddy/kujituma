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
    <div className="flex items-center gap-6 pt-6 border-t border-white/10">
      <Button
        variant="ghost"
        size="sm"
        onClick={onLike}
        disabled={isLiking}
        className="text-white/70 hover:text-red-400 hover:bg-red-400/10 transition-colors px-4 py-2 h-auto"
      >
        <Heart className={`h-5 w-5 mr-2 ${isLiking ? 'animate-pulse' : ''} ${post.user_liked ? 'fill-red-400 text-red-400' : ''}`} />
        <span className="font-medium">{post.likes || 0}</span>
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onComment}
        className="text-white/70 hover:text-blue-400 hover:bg-blue-400/10 transition-colors px-4 py-2 h-auto"
      >
        <MessageCircle className="h-5 w-5 mr-2" />
        <span className="font-medium">{commentsCount}</span>
      </Button>
    </div>
  );
};
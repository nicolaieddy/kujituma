import { Button } from "@/components/ui/button";
import { Heart, MessageCircle } from "lucide-react";
import { UnifiedPost } from "@/services/unifiedPostsService";
import { useState } from "react";
import { PostLikersModal } from "./PostLikersModal";

interface CompactFeedPostActionsProps {
  post: UnifiedPost;
  commentsCount: number;
  onLike: () => void;
  onComment: () => void;
  isLiking: boolean;
}

export const CompactFeedPostActions = ({ 
  post, 
  commentsCount, 
  onLike, 
  onComment, 
  isLiking 
}: CompactFeedPostActionsProps) => {
  const [showLikersModal, setShowLikersModal] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 pt-2 border-t border-white/5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onLike}
          disabled={isLiking}
          className="text-muted-foreground hover:text-red-400 hover:bg-red-400/5 transition-colors px-2 py-1 h-6 text-xs"
        >
          <Heart className={`h-3 w-3 mr-1 ${isLiking ? 'animate-pulse' : ''} ${post.user_liked ? 'fill-red-400 text-red-400' : ''}`} />
          <span 
            className="cursor-pointer hover:underline" 
            onClick={(e) => {
              e.stopPropagation();
              if (post.likes > 0) {
                setShowLikersModal(true);
              }
            }}
          >
            {post.likes || 0}
          </span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onComment}
          className="text-muted-foreground hover:text-blue-400 hover:bg-blue-400/5 transition-colors px-2 py-1 h-6 text-xs"
        >
          <MessageCircle className="h-3 w-3 mr-1" />
          <span>{commentsCount}</span>
        </Button>
      </div>

      <PostLikersModal
        isOpen={showLikersModal}
        onClose={() => setShowLikersModal(false)}
        postId={post.id}
      />
    </>
  );
};
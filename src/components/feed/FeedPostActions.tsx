import { Button } from "@/components/ui/button";
import { Heart, MessageCircle } from "lucide-react";
import { UnifiedPost } from "@/services/unifiedPostsService";
import { useState } from "react";
import { PostLikersModal } from "./PostLikersModal";
import { PostReactions } from "./PostReactions";

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
  const [showLikersModal, setShowLikersModal] = useState(false);

  return (
    <>
      <div className="flex items-center gap-6 pt-6 border-t border-border flex-wrap">
        {/* Emoji Reactions */}
        <PostReactions postId={post.id} />

        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            disabled={isLiking}
            className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors px-4 py-2 h-auto"
          >
            <Heart className={`h-5 w-5 mr-2 ${isLiking ? 'animate-pulse' : ''} ${post.user_liked ? 'fill-red-400 text-red-400' : ''}`} />
            <span 
              className="font-medium cursor-pointer hover:underline" 
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
            className="text-muted-foreground hover:text-blue-400 hover:bg-blue-400/10 transition-colors px-4 py-2 h-auto"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            <span className="font-medium">{commentsCount}</span>
          </Button>
        </div>
      </div>

      <PostLikersModal
        isOpen={showLikersModal}
        onClose={() => setShowLikersModal(false)}
        postId={post.id}
      />
    </>
  );
};
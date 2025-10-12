import { memo, useMemo, useState } from 'react';
import { UnifiedPost } from '@/services/unifiedPostsService';
import { CompactFeedPostCard } from './CompactFeedPostCard';
import { EnhancedFeedPostCard } from './EnhancedFeedPostCard';
import { PostContextMenu } from './PostContextMenu';
import { useDeviceType } from '@/hooks/use-mobile';

interface VirtualizedFeedListProps {
  posts: UnifiedPost[];
  useEnhancedView: boolean;
  highlightedPostId?: string | null;
  onLike: (postId: string) => void;
  onComment: (postId: string, message: string) => void;
  onCommentLike: (commentId: string) => void;
}

const PostItem = memo(({ 
  post, 
  useEnhancedView, 
  isHighlighted, 
  onLike,
  onComment,
  onCommentLike,
  onContextMenu
}: {
  post: UnifiedPost;
  useEnhancedView: boolean;
  isHighlighted: boolean;
  onLike: (postId: string) => void;
  onComment: (postId: string, message: string) => void;
  onCommentLike: (commentId: string) => void;
  onContextMenu: (post: UnifiedPost, x: number, y: number) => void;
}) => {
  const { isMobile } = useDeviceType();
  
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(post, e.clientX, e.clientY);
  };

  const handleLongPress = () => {
    if (isMobile) {
      const rect = (event?.target as HTMLElement)?.getBoundingClientRect();
      onContextMenu(post, rect?.left || 0, rect?.bottom || 0);
    }
  };

  // Long press detection for mobile
  let pressTimer: NodeJS.Timeout;
  const handleTouchStart = (e: React.TouchEvent) => {
    pressTimer = setTimeout(() => {
      const touch = e.touches[0];
      onContextMenu(post, touch.clientX, touch.clientY);
    }, 500);
  };

  const handleTouchEnd = () => {
    clearTimeout(pressTimer);
  };

  const content = useEnhancedView ? (
    <EnhancedFeedPostCard post={post} onLike={onLike} onComment={onComment} onCommentLike={onCommentLike} />
  ) : (
    <CompactFeedPostCard post={post} onLike={onLike} onComment={onComment} onCommentLike={onCommentLike} />
  );

  return (
    <div 
      className={isHighlighted ? "ring-2 ring-blue-400 ring-opacity-50 rounded-lg" : ""}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {content}
    </div>
  );
});

PostItem.displayName = 'PostItem';

export const VirtualizedFeedList = memo(({ 
  posts, 
  useEnhancedView, 
  highlightedPostId, 
  onLike,
  onComment,
  onCommentLike
}: VirtualizedFeedListProps) => {
  const [contextMenu, setContextMenu] = useState<{ post: UnifiedPost; x: number; y: number } | null>(null);

  const handleContextMenu = (post: UnifiedPost, x: number, y: number) => {
    setContextMenu({ post, x, y });
  };

  const renderedPosts = useMemo(() => 
    posts.map((post) => (
      <PostItem
        key={post.id}
        post={post}
        useEnhancedView={useEnhancedView}
        isHighlighted={highlightedPostId === post.id}
        onLike={onLike}
        onComment={onComment}
        onCommentLike={onCommentLike}
        onContextMenu={handleContextMenu}
      />
    )), [posts, useEnhancedView, highlightedPostId, onLike, onComment, onCommentLike]);

  return (
    <>
      {renderedPosts}
      {contextMenu && (
        <PostContextMenu
          post={contextMenu.post}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
});

VirtualizedFeedList.displayName = 'VirtualizedFeedList';
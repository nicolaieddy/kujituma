import { memo, useMemo } from 'react';
import { UnifiedPost } from '@/services/unifiedPostsService';
import { FeedPostCard } from './FeedPostCard';
import { EnhancedFeedPostCard } from './EnhancedFeedPostCard';

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
  onCommentLike
}: {
  post: UnifiedPost;
  useEnhancedView: boolean;
  isHighlighted: boolean;
  onLike: (postId: string) => void;
  onComment: (postId: string, message: string) => void;
  onCommentLike: (commentId: string) => void;
}) => {
  const content = useEnhancedView ? (
    <EnhancedFeedPostCard post={post} onLike={onLike} onComment={onComment} onCommentLike={onCommentLike} />
  ) : (
    <FeedPostCard post={post} onLike={onLike} onComment={onComment} onCommentLike={onCommentLike} />
  );

  return (
    <div className={isHighlighted ? "ring-2 ring-blue-400 ring-opacity-50 rounded-lg" : ""}>
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
      />
    )), [posts, useEnhancedView, highlightedPostId, onLike, onComment, onCommentLike]);

  return <>{renderedPosts}</>;
});

VirtualizedFeedList.displayName = 'VirtualizedFeedList';
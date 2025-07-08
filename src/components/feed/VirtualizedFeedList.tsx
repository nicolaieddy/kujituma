import { memo, useMemo } from 'react';
import { UnifiedPost } from '@/services/unifiedPostsService';
import { FeedPostCard } from './FeedPostCard';
import { EnhancedFeedPostCard } from './EnhancedFeedPostCard';

interface VirtualizedFeedListProps {
  posts: UnifiedPost[];
  useEnhancedView: boolean;
  highlightedPostId?: string | null;
  onUpdate: () => void;
}

const PostItem = memo(({ 
  post, 
  useEnhancedView, 
  isHighlighted, 
  onUpdate 
}: {
  post: UnifiedPost;
  useEnhancedView: boolean;
  isHighlighted: boolean;
  onUpdate: () => void;
}) => {
  const content = useEnhancedView ? (
    <EnhancedFeedPostCard post={post} onUpdate={onUpdate} />
  ) : (
    <FeedPostCard post={post} onUpdate={onUpdate} />
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
  onUpdate 
}: VirtualizedFeedListProps) => {
  const renderedPosts = useMemo(() => 
    posts.map((post) => (
      <PostItem
        key={post.id}
        post={post}
        useEnhancedView={useEnhancedView}
        isHighlighted={highlightedPostId === post.id}
        onUpdate={onUpdate}
      />
    )), [posts, useEnhancedView, highlightedPostId, onUpdate]);

  return <>{renderedPosts}</>;
});

VirtualizedFeedList.displayName = 'VirtualizedFeedList';
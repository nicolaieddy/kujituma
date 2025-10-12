import { useUnifiedPosts } from "@/hooks/useUnifiedPosts";
import { VirtualizedFeedList } from "./VirtualizedFeedList";
import { FeedSkeletonList } from "./FeedPostSkeleton";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { useState, memo } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { Loader2 } from "lucide-react";

interface FeedViewProps {
  feedType: "all" | "my";
  highlightedPostId?: string | null;
}

export const FeedView = memo(({ feedType, highlightedPostId }: FeedViewProps) => {
  const [useEnhancedView, setUseEnhancedView] = useState(false);
  
  const { posts, loading: isLoading, addComment, togglePostLike, toggleCommentLike, loadMore, hasMore, loadingMore } = useUnifiedPosts({
    feedType: feedType === "all" ? "all" : "user",
    filterPeriod: "all"
  });

  // Infinite scroll implementation
  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: loadingMore,
    threshold: 0.8
  });

  if (isLoading) {
    return <FeedSkeletonList count={3} />;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-card border-border rounded-lg p-8">
          <h3 className="text-foreground text-xl font-semibold mb-2">
            {feedType === "all" ? "No posts yet" : "You haven't shared any progress yet"}
          </h3>
          <p className="text-muted-foreground">
            {feedType === "all" 
              ? "Be the first to share your weekly progress!" 
              : "Complete your weekly objectives and share your progress with the community."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">      
      {/* View Toggle */}
      <div className="flex items-center justify-between bg-accent rounded-lg p-3 border border-border">
        <div className="flex items-center gap-2">
          <span className="text-foreground text-sm font-medium">Display Mode:</span>
        </div>
        <div className="flex items-center bg-muted rounded-lg p-1">
          <Button
            variant={useEnhancedView ? "default" : "ghost"}
            size="sm"
            onClick={() => setUseEnhancedView(true)}
            className={`px-3 py-1 text-xs ${useEnhancedView ? '' : 'text-muted-foreground'}`}
          >
            <LayoutGrid className="h-3 w-3 mr-1" />
            Enhanced
          </Button>
          <Button
            variant={!useEnhancedView ? "default" : "ghost"}
            size="sm"
            onClick={() => setUseEnhancedView(false)}
            className={`px-3 py-1 text-xs ${!useEnhancedView ? '' : 'text-muted-foreground'}`}
          >
            <List className="h-3 w-3 mr-1" />
            Compact
          </Button>
        </div>
      </div>

      {/* Posts */}
      <VirtualizedFeedList
        posts={posts}
        useEnhancedView={useEnhancedView}
        highlightedPostId={highlightedPostId}
        onLike={togglePostLike}
        onComment={addComment}
        onCommentLike={toggleCommentLike}
      />
      
      {/* Infinite Scroll Sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          {loadingMore && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading more posts...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

FeedView.displayName = 'FeedView';
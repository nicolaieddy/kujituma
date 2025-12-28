import { useUnifiedPosts } from "@/hooks/useUnifiedPosts";
import { VirtualizedFeedList } from "./VirtualizedFeedList";
import { FeedSkeletonList } from "./FeedPostSkeleton";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { useState, memo } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { Loader2 } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { PullToRefreshIndicator, RefreshFeedback } from "@/components/pwa/PullToRefreshIndicator";

interface FeedViewProps {
  feedType: "all" | "my";
  highlightedPostId?: string | null;
}

export const FeedView = memo(({ feedType, highlightedPostId }: FeedViewProps) => {
  const [useEnhancedView, setUseEnhancedView] = useState(false);
  const { isOffline } = useOfflineStatus();
  
  const { posts, loading: isLoading, isCached, addComment, togglePostLike, toggleCommentLike, loadMore, hasMore, loadingMore, refetch } = useUnifiedPosts({
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

  // Pull to refresh (mobile)
  const { 
    containerRef, 
    isPulling, 
    isRefreshing, 
    progress, 
    pullDistance,
    lastRefresh,
    showFeedback,
    hideFeedback
  } = usePullToRefresh({
    onRefresh: async () => {
      await refetch()
    },
    enabled: true
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
    <div ref={containerRef} className="space-y-6 relative">
      {/* Pull to Refresh Indicator */}
      <PullToRefreshIndicator
        isPulling={isPulling}
        isRefreshing={isRefreshing}
        progress={progress}
        pullDistance={pullDistance}
        isCached={isCached}
        isOffline={isOffline}
      />

      {/* Refresh Feedback */}
      <RefreshFeedback
        show={showFeedback}
        isFromCache={lastRefresh?.isFromCache ?? false}
        onComplete={hideFeedback}
      />
      
      {/* View Toggle - Minimal */}
      <div className="flex items-center justify-end gap-1 mb-2">
        <span className="text-xs text-muted-foreground mr-2">View:</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setUseEnhancedView(true)}
          className={`h-8 px-3 text-xs ${useEnhancedView ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
          Detailed
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setUseEnhancedView(false)}
          className={`h-8 px-3 text-xs ${!useEnhancedView ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <List className="h-3.5 w-3.5 mr-1.5" />
          Compact
        </Button>
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
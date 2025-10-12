import { useUnifiedPosts } from "@/hooks/useUnifiedPosts";
import { VirtualizedFeedList } from "./VirtualizedFeedList";
import { FeedSkeletonList } from "./FeedPostSkeleton";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, RefreshCw } from "lucide-react";
import { useState, memo } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { Loader2 } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Progress } from "@/components/ui/progress";

interface FeedViewProps {
  feedType: "all" | "my";
  highlightedPostId?: string | null;
}

export const FeedView = memo(({ feedType, highlightedPostId }: FeedViewProps) => {
  const [useEnhancedView, setUseEnhancedView] = useState(false);
  
  const { posts, loading: isLoading, addComment, togglePostLike, toggleCommentLike, loadMore, hasMore, loadingMore, refetch } = useUnifiedPosts({
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
  const { containerRef, isPulling, isRefreshing, progress, pullDistance } = usePullToRefresh({
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
      {(isPulling || isRefreshing) && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border transition-all duration-300"
          style={{ 
            transform: `translateY(${isPulling ? Math.min(pullDistance * 0.5, 60) : 0}px)`,
            opacity: isPulling ? 1 : isRefreshing ? 1 : 0
          }}
        >
          <div className="flex flex-col items-center gap-2 py-4">
            {isRefreshing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Refreshing...</span>
              </>
            ) : (
              <>
                <RefreshCw 
                  className="h-5 w-5 text-primary transition-transform" 
                  style={{ transform: `rotate(${progress * 3.6}deg)` }}
                />
                <div className="w-32">
                  <Progress value={progress} animated={false} className="h-1" />
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
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
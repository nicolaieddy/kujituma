import { useUnifiedPosts } from "@/hooks/useUnifiedPosts";
import { VirtualizedFeedList } from "./VirtualizedFeedList";
import { FeedSkeletonList } from "./FeedPostSkeleton";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { useState, memo } from "react";

interface FeedViewProps {
  feedType: "all" | "my";
  highlightedPostId?: string | null;
}

export const FeedView = memo(({ feedType, highlightedPostId }: FeedViewProps) => {
  const [useEnhancedView, setUseEnhancedView] = useState(true);
  
  const { posts, loading: isLoading, addComment, togglePostLike, toggleCommentLike } = useUnifiedPosts({
    feedType: feedType === "all" ? "all" : "user"
  });

  if (isLoading) {
    return <FeedSkeletonList count={3} />;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-white/10 backdrop-blur-lg border-white/20 rounded-lg p-8">
          <h3 className="text-white text-xl font-semibold mb-2">
            {feedType === "all" ? "No posts yet" : "You haven't shared any progress yet"}
          </h3>
          <p className="text-white/60">
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
      <div className="flex items-center justify-between bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-white/80 text-sm font-medium">Display Mode:</span>
        </div>
        <div className="flex items-center bg-white/10 rounded-lg p-1">
          <Button
            variant={useEnhancedView ? "default" : "ghost"}
            size="sm"
            onClick={() => setUseEnhancedView(true)}
            className={`px-3 py-1 text-xs ${useEnhancedView ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            <LayoutGrid className="h-3 w-3 mr-1" />
            Enhanced
          </Button>
          <Button
            variant={!useEnhancedView ? "default" : "ghost"}
            size="sm"
            onClick={() => setUseEnhancedView(false)}
            className={`px-3 py-1 text-xs ${!useEnhancedView ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
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
    </div>
  );
});

FeedView.displayName = 'FeedView';
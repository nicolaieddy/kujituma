import { useUnifiedPosts } from "@/hooks/useUnifiedPosts";
import { FeedPostCard } from "./FeedPostCard";
import { EnhancedFeedPostCard } from "./EnhancedFeedPostCard";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { useState } from "react";

interface FeedViewProps {
  feedType: "all" | "my";
  highlightedPostId?: string | null;
}

export const FeedView = ({ feedType, highlightedPostId }: FeedViewProps) => {
  const [useEnhancedView, setUseEnhancedView] = useState(true);
  
  const { posts, loading: isLoading, refetch } = useUnifiedPosts({
    feedType: feedType === "all" ? "all" : "user"
  });

  const handlePostUpdate = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/10 backdrop-blur-lg border-white/20 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-white/20 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-white/20 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
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
      {posts.map((post) => (
        <div 
          key={post.id}
          className={highlightedPostId === post.id ? "ring-2 ring-blue-400 ring-opacity-50 rounded-lg" : ""}
        >
          {useEnhancedView ? (
            <EnhancedFeedPostCard 
              post={post} 
              onUpdate={handlePostUpdate}
            />
          ) : (
            <FeedPostCard 
              post={post} 
              onUpdate={handlePostUpdate}
            />
          )}
        </div>
      ))}
    </div>
  );
};
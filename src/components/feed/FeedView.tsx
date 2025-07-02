import { useUnifiedPosts } from "@/hooks/useUnifiedPosts";
import { FeedPostCard } from "./FeedPostCard";

interface FeedViewProps {
  feedType: "all" | "my";
}

export const FeedView = ({ feedType }: FeedViewProps) => {
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
      {posts.map((post) => (
        <FeedPostCard 
          key={post.id} 
          post={post} 
          onUpdate={handlePostUpdate}
        />
      ))}
    </div>
  );
};
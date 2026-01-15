import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { CreateGoalUpdateModal } from "@/components/community/CreateGoalUpdateModal";
import { Target, UserPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const FeedSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-16 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    ))}
  </div>
);

const Feed = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return (
      <main className="container max-w-2xl mx-auto px-4 py-6">
        <FeedSkeleton />
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="container max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Community</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Share Update</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/friends')}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Find Friends</span>
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base pl-12">
            Follow your friends' goal journeys and cheer them on.
          </p>
        </div>

      {/* Community Feed */}
      <CommunityFeed />

      {/* Create Goal Update Modal */}
      <CreateGoalUpdateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </main>
  );
};

export default Feed;

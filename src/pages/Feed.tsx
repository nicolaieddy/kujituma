import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { FeedView } from "@/components/feed/FeedView";
import { FeedSkeletonList } from "@/components/feed/FeedPostSkeleton";
import { Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const Feed = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  
  const highlightedPostId = searchParams.get('post');

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background">
        <DashboardHeader isAdmin={false} onSignOut={() => {}} />
        <main className="container max-w-3xl mx-auto px-4 py-6">
          <FeedSkeletonList count={3} />
        </main>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      <DashboardHeader 
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
      />

      <main className="container max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {/* Clean Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Community</h1>
            </div>
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
          <p className="text-muted-foreground text-sm sm:text-base pl-12">
            See how everyone is progressing on their weekly journeys.
          </p>
        </div>

        {/* Feed Content */}
        <FeedView feedType="all" highlightedPostId={highlightedPostId} />
      </main>
    </div>
  );
};

export default Feed;
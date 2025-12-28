import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { FeedView } from "@/components/feed/FeedView";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { CommunitySidebar } from "@/components/community/CommunitySidebar";
import { CommunityRightSidebar } from "@/components/community/CommunityRightSidebar";
import { FeedSkeletonList } from "@/components/feed/FeedPostSkeleton";

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
      <SidebarProvider>
        <div className="min-h-screen min-h-[100dvh] bg-background flex w-full">
          <CommunitySidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader isAdmin={false} onSignOut={() => {}} />
            <div className="flex-1 p-3 sm:p-4 md:p-6">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Community</h1>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-2 mt-2">
                    See how everyone in the community is progressing on their weekly journeys.
                  </p>
                </div>
                <FeedSkeletonList count={3} />
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen min-h-[100dvh] bg-background flex w-full">
        <CommunitySidebar />
        
        <SidebarInset className="flex-1">
          <DashboardHeader 
            isAdmin={isAdmin}
            onSignOut={handleSignOut}
          />

          <div className="flex-1 flex">
            {/* Main Feed Content */}
            <div className="flex-1 p-3 sm:p-4 md:p-6">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                  <div className="flex items-center gap-2 sm:gap-3 justify-center mb-2 sm:mb-4">
                    <SidebarTrigger />
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Community</h1>
                  </div>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-2">
                    See how everyone in the community is progressing on their weekly journeys.
                  </p>
                  <div className="mt-3 sm:mt-4">
                    <button
                      onClick={() => navigate('/friends')}
                      className="text-primary hover:text-primary/80 transition-colors text-xs sm:text-sm underline"
                    >
                      Find friends to connect with →
                    </button>
                  </div>
                </div>

                <FeedView feedType="all" highlightedPostId={highlightedPostId} />
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="hidden xl:block border-l border-border/50">
              <CommunityRightSidebar />
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Feed;
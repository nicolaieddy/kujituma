import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { FeedView } from "@/components/feed/FeedView";

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <DashboardHeader 
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Community</h1>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto">
            See how everyone in the community is progressing on their weekly journeys.
          </p>
          <div className="mt-4">
            <button
              onClick={() => navigate('/friends')}
              className="text-blue-400 hover:text-blue-300 transition-colors text-sm underline"
            >
              Find friends to connect with →
            </button>
          </div>
        </div>

        <FeedView feedType="all" highlightedPostId={highlightedPostId} />
      </div>
    </div>
  );
};

export default Feed;
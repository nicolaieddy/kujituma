
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProgressPostType } from "@/types/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useSimplePosts } from "@/hooks/useSimplePosts";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import ProgressForm from "@/components/ProgressForm";
import ProgressPost from "@/components/ProgressPost";
import UserPostsModal from "@/components/UserPostsModal";
import { FilterPeriod } from "@/components/FilterDropdown";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { SearchAndFilter } from "@/components/dashboard/SearchAndFilter";
import { EmptyState } from "@/components/dashboard/EmptyState";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("14days");
  const { posts, loading: postsLoading, createPost, addComment, togglePostLike, toggleCommentLike } = useSimplePosts({ filterPeriod });
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserPosts, setShowUserPosts] = useState(false);

  const filteredPosts = posts.filter(post =>
    post.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.accomplishments.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.priorities.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.help.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmitPost = async (data: Omit<ProgressPostType, "id" | "timestamp" | "comments" | "likes" | "user_liked">) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      await createPost(data);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleAddComment = async (postId: string, commentData: { name: string; message: string }) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      await addComment(postId, commentData);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleTogglePostLike = async (postId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      await togglePostLike(postId);
    } catch (error) {
      console.error('Error toggling post like:', error);
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      await toggleCommentLike(commentId);
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleShareProgress = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setShowForm(true);
  };

  const handleViewUserPosts = (userId: string) => {
    setSelectedUserId(userId);
    setShowUserPosts(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <DashboardHeader 
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
      />

      <div className="container mx-auto px-4 py-6">
        {showForm ? (
          <div className="mb-8">
            <ProgressForm
              onSubmit={handleSubmitPost}
              onCancel={() => setShowForm(false)}
            />
          </div>
        ) : (
          <>
            {/* Welcome Section */}
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Welcome to Your Dashboard</h2>
              <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto mb-8 px-4">
                Your journey has begun! Share your progress and connect with others on their growth adventure.
              </p>
              {!user && (
                <p className="text-white/60 text-sm px-4">
                  <a href="/auth" className="text-blue-400 hover:underline">Sign in</a> to share your progress and comment on posts.
                </p>
              )}
            </div>

            {/* Share Progress Button */}
            <div className="text-center mb-8">
              <Button
                onClick={handleShareProgress}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-base px-6 py-3"
              >
                <Plus className="h-5 w-5 mr-2" />
                Share Progress
              </Button>
            </div>

            <SearchAndFilter
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterPeriod={filterPeriod}
              onFilterChange={setFilterPeriod}
              showFilters={posts.length > 0}
            />

            {/* Posts Section */}
            <div className="space-y-3 px-2 sm:px-0">
              {postsLoading ? (
                <div className="text-center text-white">Loading posts...</div>
              ) : filteredPosts.length === 0 ? (
                <EmptyState
                  searchQuery={searchQuery}
                  onClearSearch={() => setSearchQuery("")}
                  isAuthenticated={!!user}
                />
              ) : (
                filteredPosts.map((post) => (
                  <ProgressPost
                    key={post.id}
                    post={post}
                    onAddComment={(commentData) => handleAddComment(post.id, commentData)}
                    onViewUserPosts={handleViewUserPosts}
                    onTogglePostLike={handleTogglePostLike}
                    onToggleCommentLike={handleToggleCommentLike}
                    isAuthenticated={!!user}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* User Posts Modal */}
      {showUserPosts && selectedUserId && (
        <UserPostsModal
          userId={selectedUserId}
          onClose={() => {
            setShowUserPosts(false);
            setSelectedUserId(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;

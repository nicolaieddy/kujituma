
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Plus, LogOut, User, Search } from "lucide-react";
import { ProgressPostType } from "@/types/progress";
import { useAuth } from "@/contexts/AuthContext";
import { usePosts } from "@/hooks/usePosts";
import ProgressForm from "@/components/ProgressForm";
import ProgressPost from "@/components/ProgressPost";
import UserPostsModal from "@/components/UserPostsModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, session, loading: authLoading, signOut } = useAuth();
  const { posts, loading: postsLoading, createPost, addComment } = usePosts();
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

  const handleSubmitPost = async (data: Omit<ProgressPostType, "id" | "timestamp" | "comments">) => {
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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Kujituma
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleShareProgress}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Share Progress
              </Button>
              
              {user ? (
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-white text-sm hidden sm:block">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-white hover:bg-white/20"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Link to="/auth">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

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
              <h2 className="text-4xl font-bold text-white mb-6">Welcome to Your Dashboard</h2>
              <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
                Your journey has begun! Share your progress and connect with others on their growth adventure.
              </p>
              {!user && (
                <p className="text-white/60 text-sm">
                  <Link to="/auth" className="text-blue-400 hover:underline">Sign in</Link> to share your progress and comment on posts.
                </p>
              )}
            </div>

            {/* Search Bar */}
            {posts.length > 0 && (
              <div className="mb-6 max-w-md mx-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4" />
                  <Input
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60"
                  />
                </div>
              </div>
            )}

            {/* Posts Section */}
            <div className="space-y-4">
              {postsLoading ? (
                <div className="text-center text-white">Loading posts...</div>
              ) : filteredPosts.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 max-w-md mx-auto text-center">
                  {searchQuery ? (
                    <>
                      <div className="text-4xl mb-4">🔍</div>
                      <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
                      <p className="text-white/70 mb-4">
                        Try different keywords or clear your search.
                      </p>
                      <Button
                        variant="ghost"
                        onClick={() => setSearchQuery("")}
                        className="text-white hover:bg-white/20"
                      >
                        Clear Search
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="text-6xl mb-4">🚀</div>
                      <h3 className="text-xl font-semibold text-white mb-2">Ready to Share?</h3>
                      <p className="text-white/70 mb-4">
                        No progress posts yet. {user ? 'Click "Share Progress" to get started!' : 'Sign in to share your first progress post!'}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <ProgressPost
                    key={post.id}
                    post={post}
                    onAddComment={(commentData) => handleAddComment(post.id, commentData)}
                    onViewUserPosts={handleViewUserPosts}
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


import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Plus, LogOut, User } from "lucide-react";
import { ProgressPostType } from "@/types/progress";
import { useAuth } from "@/contexts/AuthContext";
import { usePosts } from "@/hooks/usePosts";
import ProgressForm from "@/components/ProgressForm";
import ProgressPost from "@/components/ProgressPost";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, session, loading: authLoading, signOut } = useAuth();
  const { posts, loading: postsLoading, createPost, addComment } = usePosts();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSubmitPost = async (data: Omit<ProgressPostType, "id" | "timestamp" | "comments">) => {
    try {
      await createPost(data);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleAddComment = async (postId: string, commentData: { name: string; message: string }) => {
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
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
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Share Progress
              </Button>
              
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
            </div>

            {/* Posts Section */}
            <div className="space-y-6">
              {postsLoading ? (
                <div className="text-center text-white">Loading posts...</div>
              ) : posts.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 max-w-md mx-auto text-center">
                  <div className="text-6xl mb-4">🚀</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Ready to Share?</h3>
                  <p className="text-white/70 mb-4">
                    No progress posts yet. Click "Share Progress" to get started!
                  </p>
                </div>
              ) : (
                posts.map((post) => (
                  <ProgressPost
                    key={post.id}
                    post={post}
                    onAddComment={(commentData) => handleAddComment(post.id, commentData)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

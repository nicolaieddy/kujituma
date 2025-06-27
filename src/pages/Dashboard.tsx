
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Plus } from "lucide-react";
import { ProgressPostType } from "@/types/progress";
import ProgressForm from "@/components/ProgressForm";
import ProgressPost from "@/components/ProgressPost";

const Dashboard = () => {
  const [showForm, setShowForm] = useState(false);
  const [posts, setPosts] = useState<ProgressPostType[]>([]);

  const handleSubmitPost = (data: Omit<ProgressPostType, "id" | "timestamp" | "comments">) => {
    const newPost: ProgressPostType = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      comments: []
    };
    setPosts(prev => [newPost, ...prev]);
    setShowForm(false);
  };

  const handleAddComment = (postId: string, commentData: { name: string; message: string }) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const newComment = {
          id: crypto.randomUUID(),
          ...commentData,
          timestamp: Date.now()
        };
        return {
          ...post,
          comments: [...post.comments, newComment]
        };
      }
      return post;
    }));
  };

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
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Share Progress
            </Button>
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
              {posts.length === 0 ? (
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

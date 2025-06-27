
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Search, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProgressForm from "@/components/ProgressForm";
import ProgressPost from "@/components/ProgressPost";
import { ProgressPostType } from "@/types/progress";

const Dashboard = () => {
  const [posts, setPosts] = useState<ProgressPostType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  // Load posts from localStorage on component mount
  useEffect(() => {
    const savedPosts = localStorage.getItem("kujituma-posts");
    if (savedPosts) {
      setPosts(JSON.parse(savedPosts));
    }
  }, []);

  // Save posts to localStorage whenever posts change
  useEffect(() => {
    localStorage.setItem("kujituma-posts", JSON.stringify(posts));
  }, [posts]);

  const handleAddPost = (postData: Omit<ProgressPostType, "id" | "timestamp" | "comments">) => {
    const newPost: ProgressPostType = {
      ...postData,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      comments: []
    };
    
    setPosts(prev => [newPost, ...prev]);
    setShowForm(false);
    
    toast({
      title: "Success!",
      description: "Your progress has been shared with the community.",
    });
  };

  const handleAddComment = (postId: string, commentData: { name: string; message: string }) => {
    const newComment = {
      id: crypto.randomUUID(),
      name: commentData.name,
      message: commentData.message,
      timestamp: Date.now()
    };

    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, comments: [...post.comments, newComment] }
        : post
    ));

    toast({
      title: "Comment added!",
      description: "Your support has been shared.",
    });
  };

  const filteredPosts = posts.filter(post =>
    post.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.accomplishments.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.priorities.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.help.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Kujituma
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
                <Input
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 w-64"
                />
              </div>
              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Post
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-white mb-4">Weekly Progress Dashboard</h2>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Share your accomplishments, set priorities, and connect with others on their growth journey
          </p>
        </div>

        {/* Progress Form */}
        {showForm && (
          <div className="mb-8">
            <ProgressForm 
              onSubmit={handleAddPost}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-6">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/60 text-lg">
                {searchTerm ? "No posts match your search." : "No posts yet. Be the first to share your progress!"}
              </p>
            </div>
          ) : (
            filteredPosts.map(post => (
              <ProgressPost
                key={post.id}
                post={post}
                onAddComment={(commentData) => handleAddComment(post.id, commentData)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

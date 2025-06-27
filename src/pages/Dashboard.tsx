
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Search, Plus, LogOut, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ProgressForm from "@/components/ProgressForm";
import ProgressPost from "@/components/ProgressPost";
import { ProgressPostType } from "@/types/progress";

const Dashboard = () => {
  const [posts, setPosts] = useState<ProgressPostType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  // Load posts from Supabase
  const loadPosts = async () => {
    try {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          id,
          name,
          accomplishments,
          priorities,
          help,
          created_at,
          comments (
            id,
            name,
            message,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPosts: ProgressPostType[] = postsData.map(post => ({
        id: post.id,
        name: post.name,
        accomplishments: post.accomplishments,
        priorities: post.priorities,
        help: post.help,
        timestamp: new Date(post.created_at).getTime(),
        comments: post.comments.map(comment => ({
          id: comment.id,
          name: comment.name,
          message: comment.message,
          timestamp: new Date(comment.created_at).getTime()
        }))
      }));

      setPosts(formattedPosts);
    } catch (error: any) {
      console.error('Error loading posts:', error);
      // Fallback to localStorage for unauthenticated users
      const savedPosts = localStorage.getItem("kujituma-posts");
      if (savedPosts) {
        setPosts(JSON.parse(savedPosts));
      }
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  // Save to localStorage as backup for unauthenticated users
  useEffect(() => {
    if (!user) {
      localStorage.setItem("kujituma-posts", JSON.stringify(posts));
    }
  }, [posts, user]);

  const handleAddPost = async (postData: Omit<ProgressPostType, "id" | "timestamp" | "comments">) => {
    if (user) {
      // Save to Supabase for authenticated users
      try {
        const { data, error } = await supabase
          .from('posts')
          .insert([{
            user_id: user.id,
            name: postData.name,
            accomplishments: postData.accomplishments,
            priorities: postData.priorities,
            help: postData.help,
          }])
          .select()
          .single();

        if (error) throw error;

        const newPost: ProgressPostType = {
          id: data.id,
          name: data.name,
          accomplishments: data.accomplishments,
          priorities: data.priorities,
          help: data.help,
          timestamp: new Date(data.created_at).getTime(),
          comments: []
        };

        setPosts(prev => [newPost, ...prev]);
        setShowForm(false);

        toast({
          title: "Success!",
          description: "Your progress has been shared with the community.",
        });
      } catch (error: any) {
        console.error('Error saving post:', error);
        toast({
          title: "Error",
          description: "Failed to save your progress. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      // Fallback to localStorage for unauthenticated users
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
        description: "Your progress has been shared locally.",
      });
    }
  };

  const handleAddComment = async (postId: string, commentData: { name: string; message: string }) => {
    if (user) {
      // Save to Supabase for authenticated users
      try {
        const { data, error } = await supabase
          .from('comments')
          .insert([{
            post_id: postId,
            user_id: user.id,
            name: commentData.name,
            message: commentData.message,
          }])
          .select()
          .single();

        if (error) throw error;

        const newComment = {
          id: data.id,
          name: data.name,
          message: data.message,
          timestamp: new Date(data.created_at).getTime()
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
      } catch (error: any) {
        console.error('Error saving comment:', error);
        toast({
          title: "Error",
          description: "Failed to save your comment. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      // Fallback to localStorage for unauthenticated users
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
        description: "Your support has been shared locally.",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const filteredPosts = posts.filter(post =>
    post.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.accomplishments.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.priorities.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.help.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Sticky Header */}
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
                <Input
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 w-64 h-9"
                />
              </div>
              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 h-9 text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Post
              </Button>
              {user ? (
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              ) : (
                <Link to="/auth">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Welcome Banner */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-3">Weekly Progress Dashboard</h2>
          <p className="text-white/80 text-base max-w-2xl mx-auto">
            Share your accomplishments, set priorities, and connect with others on their growth journey
            {!user && (
              <span className="block mt-2 text-purple-400">
                <Link to="/auth" className="hover:underline">Sign in with Google</Link> to save your progress permanently
              </span>
            )}
          </p>
        </div>

        {/* Progress Form */}
        {showForm && (
          <div className="mb-6">
            <ProgressForm 
              onSubmit={handleAddPost}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/60 text-base">
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

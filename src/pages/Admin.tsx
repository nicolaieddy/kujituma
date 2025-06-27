
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Trash2, User, ArrowLeft, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatTimeAgo } from "@/utils/timeUtils";

interface AdminPost {
  id: string;
  name: string;
  accomplishments: string;
  priorities: string;
  help: string;
  created_at: string;
  hidden: boolean;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  posts_count: number;
  role?: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (error || !data) {
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      await Promise.all([fetchPosts(), fetchUsers()]);
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            full_name,
            email,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles (role)
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get post counts for each user
      const { data: postCounts, error: postCountsError } = await supabase
        .from('posts')
        .select('user_id')
        .not('user_id', 'is', null);

      if (postCountsError) throw postCountsError;

      const postCountMap = postCounts.reduce((acc: Record<string, number>, post) => {
        acc[post.user_id] = (acc[post.user_id] || 0) + 1;
        return acc;
      }, {});

      const usersWithCounts = profilesData?.map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        posts_count: postCountMap[profile.id] || 0,
        role: profile.user_roles?.[0]?.role || 'user'
      })) || [];

      setUsers(usersWithCounts);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const togglePostVisibility = async (postId: string, currentlyHidden: boolean) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ hidden: !currentlyHidden })
        .eq('id', postId);

      if (error) throw error;
      
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, hidden: !currentlyHidden }
          : post
      ));
    } catch (error) {
      console.error('Error toggling post visibility:', error);
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      
      setPosts(posts.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading admin panel...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Access denied. Admin privileges required.</div>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-purple-400" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Admin Panel
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-lg">
            <TabsTrigger value="posts" className="text-white data-[state=active]:bg-white/20">
              Posts Management
            </TabsTrigger>
            <TabsTrigger value="users" className="text-white data-[state=active]:bg-white/20">
              Users Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Posts Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-white/80">User</TableHead>
                        <TableHead className="text-white/80">Content</TableHead>
                        <TableHead className="text-white/80">Created</TableHead>
                        <TableHead className="text-white/80">Status</TableHead>
                        <TableHead className="text-white/80">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {posts.map((post) => (
                        <TableRow key={post.id} className="border-white/20">
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={post.profiles?.avatar_url} />
                                <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-white text-sm font-medium">
                                  {post.profiles?.full_name || post.name}
                                </div>
                                <div className="text-white/60 text-xs">
                                  {post.profiles?.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-md">
                              {post.accomplishments && (
                                <div className="text-white/80 text-sm mb-1">
                                  <strong>Accomplishments:</strong> {post.accomplishments.substring(0, 100)}...
                                </div>
                              )}
                              {post.priorities && (
                                <div className="text-white/80 text-sm mb-1">
                                  <strong>Priorities:</strong> {post.priorities.substring(0, 100)}...
                                </div>
                              )}
                              {post.help && (
                                <div className="text-white/80 text-sm">
                                  <strong>Help:</strong> {post.help.substring(0, 100)}...
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-white/60 text-sm">
                              {formatTimeAgo(new Date(post.created_at).getTime())}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={post.hidden ? "destructive" : "default"}
                              className={post.hidden ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}
                            >
                              {post.hidden ? "Hidden" : "Visible"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePostVisibility(post.id, post.hidden)}
                                className="text-white/80 hover:bg-white/20"
                              >
                                {post.hidden ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deletePost(post.id)}
                                className="text-red-400 hover:bg-red-500/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Users Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-white/80">User</TableHead>
                        <TableHead className="text-white/80">Email</TableHead>
                        <TableHead className="text-white/80">Role</TableHead>
                        <TableHead className="text-white/80">Posts</TableHead>
                        <TableHead className="text-white/80">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="border-white/20">
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-white font-medium">{user.full_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-white/80">{user.email}</span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={user.role === 'admin' ? "destructive" : "default"}
                              className={
                                user.role === 'admin' 
                                  ? "bg-purple-500/20 text-purple-400" 
                                  : "bg-blue-500/20 text-blue-400"
                              }
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-white/80">{user.posts_count}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-white/60 text-sm">
                              {formatTimeAgo(new Date(user.created_at).getTime())}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;

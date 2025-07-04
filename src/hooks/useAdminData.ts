
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
  last_sign_in_at?: string;
}

interface AnalyticsData {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  newUsersThisWeek: number;
  activeUsersThisWeek: number;
  postsThisWeek: number;
  commentsThisWeek: number;
  averagePostsPerUser: number;
}

export const useAdminData = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalPosts: 0,
    totalComments: 0,
    newUsersThisWeek: 0,
    activeUsersThisWeek: 0,
    postsThisWeek: 0,
    commentsThisWeek: 0,
    averagePostsPerUser: 0
  });
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
      await Promise.all([fetchPosts(), fetchUsers(), fetchAnalytics()]);
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
          ),
          comments (count)
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
      console.log('Fetching users...');
      
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_admin_users_data');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      console.log('Users data:', usersData);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get total counts
      const [
        { count: totalUsers },
        { count: totalPosts },
        { count: totalComments }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('comments').select('*', { count: 'exact', head: true })
      ]);

      // Get this week's data
      const [
        { count: newUsersThisWeek },
        { count: postsThisWeek },
        { count: commentsThisWeek }
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneWeekAgo.toISOString()),
        supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneWeekAgo.toISOString()),
        supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneWeekAgo.toISOString())
      ]);

      // Get active users this week (users who posted or commented)
      const { data: activeUserPosts } = await supabase
        .from('posts')
        .select('user_id')
        .gte('created_at', oneWeekAgo.toISOString());

      const { data: activeUserComments } = await supabase
        .from('comments')
        .select('user_id')
        .gte('created_at', oneWeekAgo.toISOString());

      const activeUserIds = new Set([
        ...(activeUserPosts?.map(p => p.user_id) || []),
        ...(activeUserComments?.map(c => c.user_id) || [])
      ]);

      const averagePostsPerUser = totalUsers > 0 ? totalPosts / totalUsers : 0;

      setAnalytics({
        totalUsers: totalUsers || 0,
        totalPosts: totalPosts || 0,
        totalComments: totalComments || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        activeUsersThisWeek: activeUserIds.size,
        postsThisWeek: postsThisWeek || 0,
        commentsThisWeek: commentsThisWeek || 0,
        averagePostsPerUser
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
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

  return {
    posts,
    users,
    analytics,
    loading: authLoading || loading,
    isAdmin,
    togglePostVisibility,
    deletePost
  };
};

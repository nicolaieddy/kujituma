
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
}

export const useAdminData = () => {
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
      console.log('Fetching users...');
      
      // First, get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log('Profiles data:', profilesData);

      // Get user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      console.log('Roles data:', rolesData);

      // Get post counts for each user
      const { data: postCounts, error: postCountsError } = await supabase
        .from('posts')
        .select('user_id')
        .not('user_id', 'is', null);

      if (postCountsError) {
        console.error('Error fetching post counts:', postCountsError);
      }

      console.log('Post counts data:', postCounts);

      const postCountMap = postCounts?.reduce((acc: Record<string, number>, post) => {
        acc[post.user_id] = (acc[post.user_id] || 0) + 1;
        return acc;
      }, {}) || {};

      const roleMap = rolesData?.reduce((acc: Record<string, string>, role) => {
        acc[role.user_id] = role.role;
        return acc;
      }, {}) || {};

      const usersWithCounts = profilesData?.map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        posts_count: postCountMap[profile.id] || 0,
        role: roleMap[profile.id] || 'user'
      })) || [];

      console.log('Final users data:', usersWithCounts);
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

  return {
    posts,
    users,
    loading: authLoading || loading,
    isAdmin,
    togglePostVisibility,
    deletePost
  };
};

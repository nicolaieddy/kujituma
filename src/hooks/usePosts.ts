import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProgressPostType, CommentType } from '@/types/progress';

export type FilterPeriod = "1day" | "3days" | "7days" | "14days" | "30days" | "all";

interface UsePostsOptions {
  filterPeriod?: FilterPeriod;
}

export const usePosts = (options: UsePostsOptions = {}) => {
  const { filterPeriod = "14days" } = options;
  const [posts, setPosts] = useState<ProgressPostType[]>([]);
  const [loading, setLoading] = useState(true);

  const getDateFilter = (period: FilterPeriod) => {
    if (period === "all") return null;
    
    const now = new Date();
    const daysMap = {
      "1day": 1,
      "3days": 3,
      "7days": 7,
      "14days": 14,
      "30days": 30
    };
    
    const daysAgo = new Date();
    daysAgo.setDate(now.getDate() - daysMap[period]);
    return daysAgo;
  };

  const fetchPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const dateFilter = getDateFilter(filterPeriod);
      
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            full_name,
            avatar_url
          ),
          comments (
            *,
            profiles!comments_user_id_fkey (
              full_name,
              avatar_url
            )
          )
        `);

      if (dateFilter) {
        query = query.gte('created_at', dateFilter.toISOString());
      }

      const { data: postsData, error: postsError } = await query
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Get post likes for the user if authenticated
      let postLikesData: any[] = [];
      if (user) {
        const { data: postLikes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id);
        postLikesData = postLikes || [];
      }

      // Get comment likes for the user if authenticated
      let commentLikesData: any[] = [];
      if (user) {
        const { data: commentLikes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id);
        commentLikesData = commentLikes || [];
      }

      const formattedPosts: ProgressPostType[] = postsData?.map(post => ({
        id: post.id,
        name: post.profiles?.full_name || post.name,
        accomplishments: post.accomplishments,
        priorities: post.priorities,
        help: post.help,
        timestamp: new Date(post.created_at).getTime(),
        avatar_url: post.profiles?.avatar_url,
        user_id: post.user_id,
        likes: post.likes || 0,
        user_liked: user ? postLikesData.some((like: any) => like.post_id === post.id) : false,
        comments: post.comments?.map((comment: any) => ({
          id: comment.id,
          name: comment.profiles?.full_name || comment.name,
          message: comment.message,
          timestamp: new Date(comment.created_at).getTime(),
          avatar_url: comment.profiles?.avatar_url,
          likes: comment.likes || 0,
          user_liked: user ? commentLikesData.some(like => like.comment_id === comment.id) : false
        })) || []
      })) || [];

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (postData: Omit<ProgressPostType, "id" | "timestamp" | "comments" | "likes" | "user_liked">) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          name: postData.name,
          accomplishments: postData.accomplishments,
          priorities: postData.priorities,
          help: postData.help
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh posts after creating
      await fetchPosts();
      return data;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  };

  const addComment = async (postId: string, commentData: { name: string; message: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          name: commentData.name,
          message: commentData.message
        });

      if (error) throw error;

      // Refresh posts after adding comment
      await fetchPosts();
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  const togglePostLike = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('toggle_post_like', {
        _user_id: user.id,
        _post_id: postId
      });

      if (error) throw error;

      // Refresh posts after toggling like
      await fetchPosts();
      return data;
    } catch (error) {
      console.error('Error toggling post like:', error);
      throw error;
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('toggle_comment_like', {
        _user_id: user.id,
        _comment_id: commentId
      });

      if (error) throw error;

      // Refresh posts after toggling like
      await fetchPosts();
      return data;
    } catch (error) {
      console.error('Error toggling comment like:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [filterPeriod]);

  return {
    posts,
    loading,
    createPost,
    addComment,
    togglePostLike,
    toggleCommentLike,
    refetch: fetchPosts
  };
};

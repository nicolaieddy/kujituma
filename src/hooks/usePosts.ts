
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProgressPostType, CommentType } from '@/types/progress';

export const usePosts = () => {
  const [posts, setPosts] = useState<ProgressPostType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_profiles_fkey (
            full_name,
            avatar_url
          ),
          comments (
            *,
            profiles!comments_user_id_profiles_fkey (
              full_name,
              avatar_url
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      const formattedPosts: ProgressPostType[] = postsData?.map(post => ({
        id: post.id,
        name: post.profiles?.full_name || post.name,
        accomplishments: post.accomplishments,
        priorities: post.priorities,
        help: post.help,
        timestamp: new Date(post.created_at).getTime(),
        comments: post.comments?.map((comment: any) => ({
          id: comment.id,
          name: comment.profiles?.full_name || comment.name,
          message: comment.message,
          timestamp: new Date(comment.created_at).getTime()
        })) || []
      })) || [];

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (postData: Omit<ProgressPostType, "id" | "timestamp" | "comments">) => {
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

  useEffect(() => {
    fetchPosts();
  }, []);

  return {
    posts,
    loading,
    createPost,
    addComment,
    refetch: fetchPosts
  };
};

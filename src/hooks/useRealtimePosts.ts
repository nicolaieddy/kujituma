import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { unifiedPostsService, UnifiedPost, FilterPeriod } from '@/services/unifiedPostsService';
import { useToast } from '@/hooks/use-toast';

interface UseRealtimePostsOptions {
  filterPeriod?: FilterPeriod;
  userId?: string;
  feedType?: 'all' | 'user';
}

export const useRealtimePosts = (options: UseRealtimePostsOptions = {}) => {
  const { filterPeriod = "14days", userId, feedType = 'all' } = options;
  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const { toast } = useToast();

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data: UnifiedPost[];
      if (feedType === 'user' || userId) {
        data = await unifiedPostsService.getUserPosts(userId, filterPeriod);
      } else {
        data = await unifiedPostsService.getAllPosts(filterPeriod);
      }
      
      setPosts(data);
      setNewPostsCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }, [filterPeriod, userId, feedType]);

  const createPost = useCallback(async (postData: Parameters<typeof unifiedPostsService.createPost>[0]) => {
    try {
      await unifiedPostsService.createPost(postData);
      // Real-time will handle the update
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
      throw err;
    }
  }, []);

  const addComment = useCallback(async (postId: string, message: string) => {
    try {
      await unifiedPostsService.addComment(postId, message);
      // Real-time will handle the update
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
      throw err;
    }
  }, []);

  const togglePostLike = useCallback(async (postId: string) => {
    try {
      await unifiedPostsService.togglePostLike(postId);
      // Real-time will handle the update via posts table trigger
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle post like');
      throw err;
    }
  }, []);

  const toggleCommentLike = useCallback(async (commentId: string) => {
    try {
      await unifiedPostsService.toggleCommentLike(commentId);
      // Real-time will handle the update
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle comment like');
      throw err;
    }
  }, []);

  const clearNewPostsIndicator = useCallback(() => {
    setNewPostsCount(0);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Real-time subscriptions
  useEffect(() => {
    if (feedType === 'user') return; // Don't setup realtime for user-only feeds

    const channel = supabase
      .channel('community-stream')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          console.log('New post received:', payload);
          
          // Fetch fresh data to get all related information (profile, etc.)
          fetchPosts().then(() => {
            setNewPostsCount(prev => prev + 1);
            toast({
              title: "New Progress Update",
              description: "Someone just shared their weekly progress!",
              duration: 3000,
            });
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          console.log('Post updated:', payload);
          
          // Update existing post in place for likes/updates
          setPosts(currentPosts => 
            currentPosts.map(post => 
              post.id === payload.new.id 
                ? { ...post, likes: payload.new.likes || 0 }
                : post
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments'
        },
        (payload) => {
          console.log('New comment received:', payload);
          
          // Refresh posts to get updated comment counts
          fetchPosts();
          
          toast({
            title: "New Comment",
            description: "Someone added a comment to a progress update!",
            duration: 2000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [feedType, fetchPosts, toast]);

  return {
    posts,
    loading,
    error,
    newPostsCount,
    createPost,
    addComment,
    togglePostLike,
    toggleCommentLike,
    refetch: fetchPosts,
    clearNewPostsIndicator
  };
};
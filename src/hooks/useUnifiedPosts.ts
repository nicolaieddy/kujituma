import { useState, useEffect, useCallback } from 'react';
import { unifiedPostsService, UnifiedPost, FilterPeriod } from '@/services/unifiedPostsService';

interface UseUnifiedPostsOptions {
  filterPeriod?: FilterPeriod;
  userId?: string;
  feedType?: 'all' | 'user';
}

export const useUnifiedPosts = (options: UseUnifiedPostsOptions = {}) => {
  const { filterPeriod = "14days", userId, feedType = 'all' } = options;
  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      await fetchPosts(); // Refresh posts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
      throw err;
    }
  }, [fetchPosts]);

  const addComment = useCallback(async (postId: string, message: string) => {
    try {
      await unifiedPostsService.addComment(postId, message);
      await fetchPosts(); // Refresh posts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
      throw err;
    }
  }, [fetchPosts]);

  const togglePostLike = useCallback(async (postId: string) => {
    try {
      await unifiedPostsService.togglePostLike(postId);
      await fetchPosts(); // Refresh posts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle post like');
      throw err;
    }
  }, [fetchPosts]);

  const toggleCommentLike = useCallback(async (commentId: string) => {
    try {
      await unifiedPostsService.toggleCommentLike(commentId);
      await fetchPosts(); // Refresh posts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle comment like');
      throw err;
    }
  }, [fetchPosts]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    loading,
    error,
    createPost,
    addComment,
    togglePostLike,
    toggleCommentLike,
    refetch: fetchPosts
  };
};
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
      const newComment = await unifiedPostsService.addComment(postId, message);
      // Optimistic update - add comment immediately
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comments: [...post.comments, newComment]
            };
          }
          return post;
        })
      );
      return newComment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
      throw err;
    }
  }, []);

  const togglePostLike = useCallback(async (postId: string) => {
    try {
      // Optimistic update
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              user_liked: !post.user_liked,
              likes: post.user_liked ? post.likes - 1 : post.likes + 1
            };
          }
          return post;
        })
      );
      
      await unifiedPostsService.togglePostLike(postId);
    } catch (err) {
      // Revert optimistic update on error
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              user_liked: !post.user_liked,
              likes: post.user_liked ? post.likes + 1 : post.likes - 1
            };
          }
          return post;
        })
      );
      setError(err instanceof Error ? err.message : 'Failed to toggle post like');
      throw err;
    }
  }, []);

  const toggleCommentLike = useCallback(async (commentId: string) => {
    try {
      // Optimistic update
      setPosts(prevPosts => 
        prevPosts.map(post => ({
          ...post,
          comments: post.comments.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                user_liked: !comment.user_liked,
                likes: comment.user_liked ? comment.likes - 1 : comment.likes + 1
              };
            }
            return comment;
          })
        }))
      );
      
      await unifiedPostsService.toggleCommentLike(commentId);
    } catch (err) {
      // Revert optimistic update on error
      setPosts(prevPosts => 
        prevPosts.map(post => ({
          ...post,
          comments: post.comments.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                user_liked: !comment.user_liked,
                likes: comment.user_liked ? comment.likes + 1 : comment.likes - 1
              };
            }
            return comment;
          })
        }))
      );
      setError(err instanceof Error ? err.message : 'Failed to toggle comment like');
      throw err;
    }
  }, []);

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
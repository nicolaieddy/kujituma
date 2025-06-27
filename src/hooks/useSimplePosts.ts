
import { useState, useEffect } from 'react';
import { ProgressPostType } from '@/types/progress';
import { postsService, FilterPeriod } from '@/services/postsService';

interface UsePostsOptions {
  filterPeriod?: FilterPeriod;
}

export const useSimplePosts = (options: UsePostsOptions = {}) => {
  const { filterPeriod = "14days" } = options;
  const [posts, setPosts] = useState<ProgressPostType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const data = await postsService.fetchPosts(filterPeriod);
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (postData: Omit<ProgressPostType, "id" | "timestamp" | "comments" | "likes" | "user_liked">) => {
    try {
      await postsService.createPost(postData);
      await fetchPosts(); // Refresh posts
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  };

  const addComment = async (postId: string, commentData: { name: string; message: string }) => {
    try {
      await postsService.addComment(postId, commentData);
      await fetchPosts(); // Refresh posts
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  const togglePostLike = async (postId: string) => {
    try {
      await postsService.togglePostLike(postId);
      await fetchPosts(); // Refresh posts
    } catch (error) {
      console.error('Error toggling post like:', error);
      throw error;
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    try {
      await postsService.toggleCommentLike(commentId);
      await fetchPosts(); // Refresh posts
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

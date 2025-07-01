import { supabase } from "@/integrations/supabase/client";

export interface FeedPost {
  id: string;
  user_id: string;
  name: string;
  accomplishments: string;
  priorities: string;
  help: string;
  week_start: string;
  week_end: string;
  objectives_completed: number;
  total_objectives: number;
  completion_percentage: number;
  likes: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  name: string;
  message: string;
  likes: number;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export class FeedService {
  static async getAllPosts(limit = 20, offset = 0): Promise<FeedPost[]> {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching all posts:', error);
      throw error;
    }

    return posts as FeedPost[];
  }

  static async getUserPosts(userId?: string, limit = 20, offset = 0): Promise<FeedPost[]> {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    
    if (!targetUserId) throw new Error('User not authenticated');

    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('user_id', targetUserId)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching user posts:', error);
      throw error;
    }

    return posts as FeedPost[];
  }

  static async getPostComments(postId: string): Promise<Comment[]> {
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }

    return comments as Comment[];
  }

  static async addComment(postId: string, message: string): Promise<Comment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        name: profile?.full_name || 'Anonymous',
        message: message,
      })
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      throw error;
    }

    return comment as Comment;
  }

  static async togglePostLike(postId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: isLiked, error } = await supabase.rpc('toggle_post_like', {
      _user_id: user.id,
      _post_id: postId
    });

    if (error) {
      console.error('Error toggling post like:', error);
      throw error;
    }

    return isLiked;
  }

  static async toggleCommentLike(commentId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: isLiked, error } = await supabase.rpc('toggle_comment_like', {
      _user_id: user.id,
      _comment_id: commentId
    });

    if (error) {
      console.error('Error toggling comment like:', error);
      throw error;
    }

    return isLiked;
  }

  static async getPostByWeek(userId: string, weekStart: string): Promise<FeedPost | null> {
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .eq('hidden', false)
      .maybeSingle();

    if (error) {
      console.error('Error fetching post by week:', error);
      throw error;
    }

    return post as FeedPost | null;
  }
}
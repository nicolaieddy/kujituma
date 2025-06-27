
import { supabase } from '@/integrations/supabase/client';
import { ProgressPostType } from '@/types/progress';
import { getDateFromPeriod } from '@/utils/dateUtils';

export type FilterPeriod = "1day" | "3days" | "7days" | "14days" | "30days" | "all";

export const postsService = {
  async fetchPosts(filterPeriod: FilterPeriod = "14days") {
    const { data: { user } } = await supabase.auth.getUser();
    const dateFilter = getDateFromPeriod(filterPeriod);
    
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

    const { data: postsData, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    // Get user likes
    const [postLikesData, commentLikesData] = await Promise.all([
      user ? supabase.from('post_likes').select('post_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
      user ? supabase.from('comment_likes').select('comment_id').eq('user_id', user.id) : Promise.resolve({ data: [] })
    ]);

    return this.formatPostsData(postsData, user, postLikesData.data || [], commentLikesData.data || []);
  },

  formatPostsData(postsData: any[], user: any, postLikes: any[], commentLikes: any[]): ProgressPostType[] {
    return postsData?.map(post => ({
      id: post.id,
      name: post.profiles?.full_name || post.name,
      accomplishments: post.accomplishments,
      priorities: post.priorities,
      help: post.help,
      timestamp: new Date(post.created_at).getTime(),
      avatar_url: post.profiles?.avatar_url,
      user_id: post.user_id,
      likes: post.likes || 0,
      user_liked: user ? postLikes.some((like: any) => like.post_id === post.id) : false,
      comments: post.comments?.map((comment: any) => ({
        id: comment.id,
        name: comment.profiles?.full_name || comment.name,
        message: comment.message,
        timestamp: new Date(comment.created_at).getTime(),
        avatar_url: comment.profiles?.avatar_url,
        likes: comment.likes || 0,
        user_liked: user ? commentLikes.some(like => like.comment_id === comment.id) : false
      })) || []
    })) || [];
  },

  async createPost(postData: Omit<ProgressPostType, "id" | "timestamp" | "comments" | "likes" | "user_liked">) {
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
    return data;
  },

  async addComment(postId: string, commentData: { name: string; message: string }) {
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
  },

  async togglePostLike(postId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('toggle_post_like', {
      _user_id: user.id,
      _post_id: postId
    });

    if (error) throw error;
    return data;
  },

  async toggleCommentLike(commentId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('toggle_comment_like', {
      _user_id: user.id,
      _comment_id: commentId
    });

    if (error) throw error;
    return data;
  }
};

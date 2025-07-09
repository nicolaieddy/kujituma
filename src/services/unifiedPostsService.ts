import { supabase } from '@/integrations/supabase/client';
import { getDateFromPeriod } from '@/utils/dateUtils';
import { lightweightCache } from './lightweightCache';

export type FilterPeriod = "1day" | "3days" | "7days" | "14days" | "30days" | "all";

export interface UnifiedPost {
  id: string;
  user_id: string;
  name: string;
  accomplishments: string;
  priorities: string;
  help: string;
  week_start?: string;
  week_end?: string;
  objectives_completed?: number;
  total_objectives?: number;
  completion_percentage?: number;
  likes: number;
  user_liked: boolean;
  created_at: string;
  updated_at: string;
  timestamp: number;
  avatar_url?: string | null;
  comments: UnifiedComment[];
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface UnifiedComment {
  id: string;
  user_id: string;
  post_id: string;
  name: string;
  message: string;
  likes: number;
  user_liked: boolean;
  timestamp: number;
  created_at: string;
  avatar_url?: string | null;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

class UnifiedPostsService {
  private async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  private likesCache = new Map<string, { postLikes: any[], commentLikes: any[], timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private async getUserLikes(userId: string) {
    const cacheKey = userId;
    const cached = this.likesCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return { postLikes: cached.postLikes, commentLikes: cached.commentLikes };
    }

    const [postLikesResult, commentLikesResult] = await Promise.all([
      supabase.from('post_likes').select('post_id').eq('user_id', userId),
      supabase.from('comment_likes').select('comment_id').eq('user_id', userId)
    ]);

    const result = {
      postLikes: postLikesResult.data || [],
      commentLikes: commentLikesResult.data || []
    };

    this.likesCache.set(cacheKey, { ...result, timestamp: Date.now() });
    return result;
  }

  private formatPost(post: any, user: any, postLikes: any[], commentLikes: any[]): UnifiedPost {
    return {
      id: post.id,
      user_id: post.user_id,
      name: post.profiles?.full_name || post.name,
      accomplishments: post.accomplishments,
      priorities: post.priorities,
      help: post.help,
      week_start: post.week_start,
      week_end: post.week_end,
      objectives_completed: post.objectives_completed,
      total_objectives: post.total_objectives,
      completion_percentage: post.completion_percentage,
      likes: post.likes || 0,
      user_liked: user ? postLikes.some((like: any) => like.post_id === post.id) : false,
      created_at: post.created_at,
      updated_at: post.updated_at,
      timestamp: new Date(post.created_at).getTime(),
      avatar_url: post.profiles?.avatar_url,
      profiles: post.profiles,
      comments: post.comments?.map((comment: any) => this.formatComment(comment, user, commentLikes)) || []
    };
  }

  private formatComment(comment: any, user: any, commentLikes: any[]): UnifiedComment {
    return {
      id: comment.id,
      user_id: comment.user_id,
      post_id: comment.post_id,
      name: comment.profiles?.full_name || comment.name,
      message: comment.message,
      likes: comment.likes || 0,
      user_liked: user ? commentLikes.some(like => like.comment_id === comment.id) : false,
      timestamp: new Date(comment.created_at).getTime(),
      created_at: comment.created_at,
      avatar_url: comment.profiles?.avatar_url,
      profiles: comment.profiles
    };
  }

  async getAllPosts(filterPeriod: FilterPeriod = "14days", limit = 20, offset = 0): Promise<UnifiedPost[]> {
    const user = await this.getCurrentUser();
    const cacheKey = lightweightCache.keys.posts(`${filterPeriod}_${limit}_${offset}`);
    
    // Try cache first
    const cached = lightweightCache.get<UnifiedPost[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const dateFilter = getDateFromPeriod(filterPeriod);
    
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        ),
        comments (
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        )
      `)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (dateFilter) {
      query = query.gte('created_at', dateFilter.toISOString());
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    let postLikes: any[] = [];
    let commentLikes: any[] = [];

    if (user) {
      const likes = await this.getUserLikes(user.id);
      postLikes = likes.postLikes;
      commentLikes = likes.commentLikes;
    }

    const result = posts?.map(post => this.formatPost(post, user, postLikes, commentLikes)) || [];
    
    // Cache the result for 3 minutes
    lightweightCache.set(cacheKey, result, 3 * 60 * 1000);
    
    return result;
  }

  async getUserPosts(userId?: string, filterPeriod: FilterPeriod = "14days", limit = 20, offset = 0): Promise<UnifiedPost[]> {
    const user = await this.getCurrentUser();
    const targetUserId = userId || user?.id;
    
    if (!targetUserId) throw new Error('User not authenticated');

    const dateFilter = getDateFromPeriod(filterPeriod);
    
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        ),
        comments (
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        )
      `)
      .eq('user_id', targetUserId)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (dateFilter) {
      query = query.gte('created_at', dateFilter.toISOString());
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    let postLikes: any[] = [];
    let commentLikes: any[] = [];

    if (user) {
      const likes = await this.getUserLikes(user.id);
      postLikes = likes.postLikes;
      commentLikes = likes.commentLikes;
    }

    return posts?.map(post => this.formatPost(post, user, postLikes, commentLikes)) || [];
  }

  async getPostComments(postId: string): Promise<UnifiedComment[]> {
    const user = await this.getCurrentUser();
    
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

    if (error) throw error;

    let commentLikes: any[] = [];
    if (user) {
      const { data } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', user.id);
      commentLikes = data || [];
    }

    return comments?.map(comment => this.formatComment(comment, user, commentLikes)) || [];
  }

  async createPost(postData: Omit<UnifiedPost, "id" | "timestamp" | "comments" | "likes" | "user_liked" | "created_at" | "updated_at" | "profiles">): Promise<UnifiedPost> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        name: postData.name,
        accomplishments: postData.accomplishments,
        priorities: postData.priorities,
        help: postData.help,
        week_start: postData.week_start,
        week_end: postData.week_end,
        objectives_completed: postData.objectives_completed,
        total_objectives: postData.total_objectives,
        completion_percentage: postData.completion_percentage
      })
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    return this.formatPost(data, user, [], []);
  }

  async addComment(postId: string, message: string): Promise<UnifiedComment> {
    const user = await this.getCurrentUser();
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

    if (error) throw error;

    return this.formatComment(comment, user, []);
  }

  async togglePostLike(postId: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Invalidate cache when toggling likes
    this.likesCache.delete(user.id);

    const { data: isLiked, error } = await supabase.rpc('toggle_post_like', {
      _user_id: user.id,
      _post_id: postId
    });

    if (error) throw error;
    return isLiked;
  }

  async toggleCommentLike(commentId: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Invalidate cache when toggling likes
    this.likesCache.delete(user.id);

    const { data: isLiked, error } = await supabase.rpc('toggle_comment_like', {
      _user_id: user.id,
      _comment_id: commentId
    });

    if (error) throw error;
    return isLiked;
  }

  async getPostByWeek(userId: string, weekStart: string): Promise<UnifiedPost | null> {
    const user = await this.getCurrentUser();
    
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        ),
        comments (
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        )
      `)
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .eq('hidden', false)
      .maybeSingle();

    if (error) throw error;
    if (!post) return null;

    let postLikes: any[] = [];
    let commentLikes: any[] = [];

    if (user) {
      const likes = await this.getUserLikes(user.id);
      postLikes = likes.postLikes;
      commentLikes = likes.commentLikes;
    }

    return this.formatPost(post, user, postLikes, commentLikes);
  }
}

export const unifiedPostsService = new UnifiedPostsService();
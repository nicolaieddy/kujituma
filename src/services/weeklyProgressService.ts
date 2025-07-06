import { supabase } from "@/integrations/supabase/client";
import { WeeklyObjective, WeeklyProgressPost, CreateWeeklyObjectiveData, UpdateWeeklyObjectiveData } from "@/types/weeklyProgress";

export class WeeklyProgressService {
  static async getWeeklyObjectives(weekStart: string): Promise<WeeklyObjective[]> {
    console.log('Fetching objectives for week:', weekStart);
    
    // Check authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      throw new Error('User not authenticated');
    }
    console.log('Authenticated user:', user.id);
    
    const { data: objectives, error } = await supabase
      .from('weekly_objectives')
      .select('*')
      .eq('week_start', weekStart)
      .eq('user_id', user.id)  // Explicitly filter by user_id
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching objectives:', error);
      throw error;
    }
    console.log('Fetched objectives:', objectives?.length || 0);
    return (objectives || []) as WeeklyObjective[];
  }

  static async createWeeklyObjective(data: CreateWeeklyObjectiveData): Promise<WeeklyObjective> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('Creating objective:', data);
    const { data: objective, error } = await supabase
      .from('weekly_objectives')
      .insert({
        user_id: user.id,
        goal_id: data.goal_id || null,
        text: data.text,
        week_start: data.week_start,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating objective:', error);
      throw error;
    }
    console.log('Created objective:', objective);
    return objective as WeeklyObjective;
  }

  static async updateWeeklyObjective(id: string, data: UpdateWeeklyObjectiveData): Promise<WeeklyObjective> {
    console.log('Updating objective:', id, data);
    const { data: objective, error } = await supabase
      .from('weekly_objectives')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating objective:', error);
      throw error;
    }
    console.log('Updated objective:', objective);
    return objective as WeeklyObjective;
  }

  static async deleteWeeklyObjective(id: string): Promise<void> {
    console.log('Deleting objective:', id);
    const { error } = await supabase
      .from('weekly_objectives')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting objective:', error);
      throw error;
    }
    console.log('Deleted objective:', id);
  }

  static async deleteAllWeeklyObjectives(weekStart: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('Deleting all objectives for user:', user.id, 'week:', weekStart);
    const { data, error } = await supabase.rpc('delete_all_weekly_objectives', {
      _user_id: user.id,
      _week_start: weekStart
    });

    if (error) {
      console.error('Error deleting all objectives:', error);
      throw error;
    }
    
    const deletedCount = data || 0;
    console.log('Deleted', deletedCount, 'objectives');
    return deletedCount;
  }

  static async getWeeklyProgressPost(weekStart: string): Promise<WeeklyProgressPost | null> {
    console.log('Fetching progress post for week:', weekStart);
    
    // Check authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      throw new Error('User not authenticated');
    }
    console.log('Authenticated user:', user.id);
    
    // Add more specific logging
    console.log('Query params:', { weekStart, userId: user.id });
    
    const { data: post, error } = await supabase
      .from('weekly_progress_posts')
      .select('*')
      .eq('week_start', weekStart)
      .eq('user_id', user.id)
      .limit(1)  // Add explicit limit to prevent multiple rows
      .single();  // Use single but with limit for safety

    if (error) {
      // If no data found, return null instead of throwing
      if (error.code === 'PGRST116') {
        console.log('No progress post found for this week');
        return null;
      }
      console.error('Error fetching progress post:', error);
      throw error;
    }
    console.log('Fetched progress post:', post ? 'found' : 'not found');
    return post as WeeklyProgressPost | null;
  }

  static async upsertWeeklyProgressPost(weekStart: string, notes: string): Promise<WeeklyProgressPost> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: post, error } = await supabase
      .from('weekly_progress_posts')
      .upsert({
        user_id: user.id,
        week_start: weekStart,
        notes: notes,
      })
      .select()
      .single();

    if (error) throw error;
    return post as WeeklyProgressPost;
  }

  static async upsertWeeklyProgressPostWithReflections(
    weekStart: string, 
    notes: string, 
    incompleteReflections?: Record<string, string>
  ): Promise<WeeklyProgressPost> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: post, error } = await supabase
      .from('weekly_progress_posts')
      .upsert({
        user_id: user.id,
        week_start: weekStart,
        notes: notes,
        incomplete_reflections: incompleteReflections || {},
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting progress post with reflections:', error);
      throw error;
    }
    return post as WeeklyProgressPost;
  }

  static async completeWeek(weekStart: string): Promise<WeeklyProgressPost> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: post, error } = await supabase
      .from('weekly_progress_posts')
      .upsert({
        user_id: user.id,
        week_start: weekStart,
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return post as WeeklyProgressPost;
  }

  static async uncompleteWeek(weekStart: string): Promise<WeeklyProgressPost> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: post, error } = await supabase
      .from('weekly_progress_posts')
      .update({
        is_completed: false,
        completed_at: null,
      })
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .select()
      .single();

    if (error) throw error;
    return post as WeeklyProgressPost;
  }

  /**
   * Get the start of the week (Monday) for a given date
   * Returns date in YYYY-MM-DD format
   */
  static getWeekStart(date: Date = new Date()): string {
    console.log('Getting week start for date:', date.toISOString());
    
    // Create a new date to avoid mutating the input and ensure UTC consistency
    const startOfWeek = new Date(date.getTime());
    
    // Get the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeek = startOfWeek.getUTCDay();
    
    // Calculate how many days to subtract to get to Monday
    // If it's Sunday (0), we need to go back 6 days to get to Monday
    // If it's Monday (1), we need to go back 0 days
    // If it's Tuesday (2), we need to go back 1 day, etc.
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    // Set to the start of the week (Monday) using UTC methods
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - daysToSubtract);
    
    // Return in YYYY-MM-DD format
    const result = startOfWeek.toISOString().split('T')[0];
    console.log('Week start calculated:', result);
    return result;
  }

  static formatWeekRange(weekStart: string): string {
    const start = new Date(weekStart + 'T00:00:00.000Z');
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    
    const formatOptions: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      timeZone: 'UTC'
    };
    
    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
  }

  static getWeekNumber(weekStart: string): number {
    const start = new Date(weekStart + 'T00:00:00.000Z');
    const startOfYear = new Date(Date.UTC(start.getUTCFullYear(), 0, 1));
    const days = Math.floor((start.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getUTCDay() + 1) / 7);
  }
}

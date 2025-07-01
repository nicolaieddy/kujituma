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

  static async getWeeklyProgressPost(weekStart: string): Promise<WeeklyProgressPost | null> {
    console.log('Fetching progress post for week:', weekStart);
    
    // Check authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      throw new Error('User not authenticated');
    }
    console.log('Authenticated user:', user.id);
    
    const { data: post, error } = await supabase
      .from('weekly_progress_posts')
      .select('*')
      .eq('week_start', weekStart)
      .eq('user_id', user.id)  // Explicitly filter by user_id
      .maybeSingle();  // Use maybeSingle instead of single to avoid errors when no data

    if (error) {
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
   * Get the start of the week (Sunday) for a given date
   * Returns date in YYYY-MM-DD format
   */
  static getWeekStart(date: Date = new Date()): string {
    console.log('Getting week start for date:', date.toISOString());
    
    // Create a new date to avoid mutating the input
    const startOfWeek = new Date(date);
    
    // Get the day of the week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = startOfWeek.getDay();
    
    // Calculate how many days to subtract to get to Sunday
    const daysToSubtract = dayOfWeek;
    
    // Set to the start of the week (Sunday)
    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
    
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
    const startOfYear = new Date(start.getUTCFullYear(), 0, 1);
    const days = Math.floor((start.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  }
}

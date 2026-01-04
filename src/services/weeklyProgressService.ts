import { supabase } from "@/integrations/supabase/client";
import { WeeklyObjective, WeeklyProgressPost, CreateWeeklyObjectiveData, UpdateWeeklyObjectiveData } from "@/types/weeklyProgress";
import { parseISO, startOfWeek, isBefore } from "date-fns";

export class WeeklyProgressService {
  static async getWeeklyObjectives(weekStart: string): Promise<WeeklyObjective[]> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }
    
    const { data: objectives, error } = await supabase
      .from('weekly_objectives')
      .select('*, goals(start_date)')
      .eq('week_start', weekStart)
      .eq('user_id', user.id)
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Filter out objectives for goals that haven't started yet
    const weekDate = parseISO(weekStart);
    const filteredObjectives = (objectives || []).filter((obj: any) => {
      // If no goal linked or no start_date, include it
      if (!obj.goals || !obj.goals.start_date) {
        return true;
      }
      
      // Check if the goal's start date is after this week
      const goalStartDate = parseISO(obj.goals.start_date);
      const goalStartWeek = startOfWeek(goalStartDate, { weekStartsOn: 1 });
      
      // Include only if the week is on or after the goal's start week
      return !isBefore(weekDate, goalStartWeek);
    }).map((obj: any) => {
      // Remove the joined goals data before returning
      const { goals, ...objective } = obj;
      return objective;
    });
    
    return filteredObjectives as WeeklyObjective[];
  }

  /**
   * Fetch objectives for multiple weeks in a single query (faster than per-week calls).
   */
  static async getWeeklyObjectivesForWeeks(weekStarts: string[]): Promise<WeeklyObjective[]> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    if (!weekStarts.length) return [];

    const { data: objectives, error } = await supabase
      .from('weekly_objectives')
      .select('*, goals(start_date)')
      .in('week_start', weekStarts)
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) throw error;

    const filtered = (objectives || [])
      .filter((obj: any) => {
        if (!obj.goals || !obj.goals.start_date) return true;

        const weekDate = parseISO(obj.week_start);
        const goalStartDate = parseISO(obj.goals.start_date);
        const goalStartWeek = startOfWeek(goalStartDate, { weekStartsOn: 1 });
        return !isBefore(weekDate, goalStartWeek);
      })
      .map((obj: any) => {
        const { goals, ...objective } = obj;
        return objective;
      });

    return filtered as WeeklyObjective[];
  }

  static async createWeeklyObjective(data: CreateWeeklyObjectiveData): Promise<WeeklyObjective> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');


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

    if (error) throw error;
    return objective as WeeklyObjective;
  }

  static async updateWeeklyObjective(id: string, data: UpdateWeeklyObjectiveData): Promise<WeeklyObjective> {
    const { data: objective, error } = await supabase
      .from('weekly_objectives')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return objective as WeeklyObjective;
  }

  static async deleteWeeklyObjective(id: string): Promise<void> {
    const { error } = await supabase
      .from('weekly_objectives')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async deleteAllWeeklyObjectives(weekStart: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('delete_all_weekly_objectives', {
      _user_id: user.id,
      _week_start: weekStart
    });

    if (error) throw error;
    return data || 0;
  }

  static async getWeeklyProgressPost(weekStart: string): Promise<WeeklyProgressPost | null> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Use maybeSingle() to avoid 406 "Not Acceptable" when no row exists yet.
    const { data: post, error } = await supabase
      .from('weekly_progress_posts')
      .select('*')
      .eq('week_start', weekStart)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return (post as WeeklyProgressPost) ?? null;
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
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,week_start',
        ignoreDuplicates: false
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
      }, {
        onConflict: 'user_id,week_start'
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
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,week_start'
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
    const startOfWeek = new Date(date.getTime());
    const dayOfWeek = startOfWeek.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
    
    const year = startOfWeek.getFullYear();
    const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const day = String(startOfWeek.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static formatWeekRange(weekStart: string): string {
    const [year, month, day] = weekStart.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const formatOptions: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric'
    };
    
    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
  }

  /**
   * Check if today is within the week defined by weekStart (Mon-Sun)
   */
  static isCurrentWeek(weekStart: string, date: Date = new Date()): boolean {
    const [year, month, day] = weekStart.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const todayLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    return todayLocal >= startLocal && todayLocal <= endLocal;
  }

  /**
   * Get ISO week number for a given week start date.
   * Uses ISO 8601 standard where Week 1 is the week containing the first Thursday of the year.
   */
  static getWeekNumber(weekStart: string): number {
    const [year, month, day] = weekStart.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    // Set to Thursday of the current week (ISO weeks are defined by their Thursday)
    const thursday = new Date(date.getTime());
    thursday.setDate(date.getDate() + (4 - (date.getDay() || 7)));
    
    // Get the first Thursday of the year
    const yearStart = new Date(thursday.getFullYear(), 0, 1);
    const firstThursday = new Date(yearStart.getTime());
    // Find first Thursday of the year
    const dayOfWeek = yearStart.getDay();
    const daysToThursday = dayOfWeek <= 4 ? 4 - dayOfWeek : 11 - dayOfWeek;
    firstThursday.setDate(yearStart.getDate() + daysToThursday);
    
    // Calculate week number
    const weekNumber = Math.floor((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    
    return weekNumber;
  }

  static async getIncompleteObjectivesFromPreviousWeeks(currentWeekStart: string): Promise<WeeklyObjective[]> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }
    
    const { data: objectives, error } = await supabase
      .from('weekly_objectives')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .lt('week_start', currentWeekStart)
      .order('week_start', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (objectives || []) as WeeklyObjective[];
  }

  static async carryOverObjectives(objectiveIds: string[], newWeekStart: string): Promise<WeeklyObjective[]> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data: originalObjectives, error: fetchError } = await supabase
      .from('weekly_objectives')
      .select('*')
      .in('id', objectiveIds)
      .eq('user_id', user.id);

    if (fetchError) throw fetchError;

    if (!originalObjectives || originalObjectives.length === 0) {
      return [];
    }

    const objectivesToCreate = originalObjectives.map(obj => ({
      user_id: user.id,
      goal_id: obj.goal_id,
      text: obj.text,
      week_start: newWeekStart,
      is_completed: false
    }));

    const { data: newObjectives, error: createError } = await supabase
      .from('weekly_objectives')
      .insert(objectivesToCreate)
      .select();

    if (createError) throw createError;
    return (newObjectives || []) as WeeklyObjective[];
  }

  static async getObjectivesForQuarter(year: number, quarter: number): Promise<WeeklyObjective[]> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const startMonth = (quarter - 1) * 3;
    const quarterStart = new Date(year, startMonth, 1);
    const quarterEnd = new Date(year, startMonth + 3, 0);
    
    const startDate = quarterStart.toISOString().split('T')[0];
    const endDate = quarterEnd.toISOString().split('T')[0];

    const { data: objectives, error } = await supabase
      .from('weekly_objectives')
      .select('*')
      .eq('user_id', user.id)
      .gte('week_start', startDate)
      .lte('week_start', endDate)
      .order('week_start', { ascending: true });

    if (error) throw error;
    return (objectives || []) as WeeklyObjective[];
  }
}
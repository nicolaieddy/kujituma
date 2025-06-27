
import { supabase } from "@/integrations/supabase/client";
import { WeeklyObjective, WeeklyProgressPost, CreateWeeklyObjectiveData, UpdateWeeklyObjectiveData } from "@/types/weeklyProgress";

export class WeeklyProgressService {
  static async getWeeklyObjectives(weekStart: string): Promise<WeeklyObjective[]> {
    const { data: objectives, error } = await supabase
      .from('weekly_objectives')
      .select('*')
      .eq('week_start', weekStart)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (objectives || []) as WeeklyObjective[];
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

  static async getWeeklyProgressPost(weekStart: string): Promise<WeeklyProgressPost | null> {
    const { data: post, error } = await supabase
      .from('weekly_progress_posts')
      .select('*')
      .eq('week_start', weekStart)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
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

  static getWeekStart(date: Date = new Date()): string {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek.toISOString().split('T')[0];
  }

  static formatWeekRange(weekStart: string): string {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
}

import { supabase } from "@/integrations/supabase/client";
import {
  DailyCheckIn,
  UserStreaks,
  QuarterlyReview,
  WeeklyPlanningSession,
  CreateDailyCheckIn,
  CreateQuarterlyReview,
  CreateWeeklyPlanningSession
} from "@/types/habits";
import { getLocalDateString } from "@/utils/dateUtils";

export class HabitsService {
  // ============ DAILY CHECK-INS ============
  
  static async getTodayCheckIn(): Promise<DailyCheckIn | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;
    
    const today = getLocalDateString();
    
    const { data, error } = await supabase
      .from('daily_check_ins')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('check_in_date', today)
      .maybeSingle();
    
    if (error) throw error;
    return data as DailyCheckIn | null;
  }
  
  static async createOrUpdateCheckIn(checkIn: CreateDailyCheckIn): Promise<DailyCheckIn> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');
    
    const today = getLocalDateString();
    
    const { data, error } = await supabase
      .from('daily_check_ins')
      .upsert({
        user_id: user.user.id,
        check_in_date: today,
        ...checkIn
      }, { onConflict: 'user_id,check_in_date' })
      .select()
      .single();
    
    if (error) throw error;
    
    // Update streaks after check-in
    await this.updateDailyStreak();
    
    return data as DailyCheckIn;
  }
  
  static async getRecentCheckIns(days: number = 7): Promise<DailyCheckIn[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('daily_check_ins')
      .select('*')
      .eq('user_id', user.user.id)
      .gte('check_in_date', startDate.toISOString().split('T')[0])
      .order('check_in_date', { ascending: false });
    
    if (error) throw error;
    return (data || []) as DailyCheckIn[];
  }

  static async getAllDailyCheckIns(limit: number = 30): Promise<DailyCheckIn[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];
    
    const { data, error } = await supabase
      .from('daily_check_ins')
      .select('*')
      .eq('user_id', user.user.id)
      .order('check_in_date', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return (data || []) as DailyCheckIn[];
  }
  
  // ============ STREAKS ============
  
  static async getStreaks(): Promise<UserStreaks | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;
    
    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.user.id)
      .maybeSingle();
    
    if (error) throw error;
    return data as UserStreaks | null;
  }
  
  static async updateDailyStreak(): Promise<UserStreaks> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');
    
    const today = getLocalDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);
    
    // Get current streaks
    let streaks = await this.getStreaks();
    
    if (!streaks) {
      // Create initial streak record
      const { data, error } = await supabase
        .from('user_streaks')
        .insert({
          user_id: user.user.id,
          current_daily_streak: 1,
          longest_daily_streak: 1,
          current_weekly_streak: 0,
          longest_weekly_streak: 0,
          last_check_in_date: today
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as UserStreaks;
    }
    
    // Already checked in today
    if (streaks.last_check_in_date === today) {
      return streaks;
    }
    
    let newDailyStreak = 1;
    
    // If last check-in was yesterday, increment streak
    if (streaks.last_check_in_date === yesterdayStr) {
      newDailyStreak = streaks.current_daily_streak + 1;
    }
    
    const longestDaily = Math.max(newDailyStreak, streaks.longest_daily_streak);
    
    const { data, error } = await supabase
      .from('user_streaks')
      .update({
        current_daily_streak: newDailyStreak,
        longest_daily_streak: longestDaily,
        last_check_in_date: today
      })
      .eq('user_id', user.user.id)
      .select()
      .single();
    
    if (error) throw error;
    return data as UserStreaks;
  }
  
  static async updateWeeklyStreak(weekStart: string): Promise<UserStreaks> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');
    
    let streaks = await this.getStreaks();
    
    // Get last week's date
    const lastWeek = new Date(weekStart);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekStr = lastWeek.toISOString().split('T')[0];
    
    if (!streaks) {
      const { data, error } = await supabase
        .from('user_streaks')
        .insert({
          user_id: user.user.id,
          current_daily_streak: 0,
          longest_daily_streak: 0,
          current_weekly_streak: 1,
          longest_weekly_streak: 1,
          last_week_completed: weekStart
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as UserStreaks;
    }
    
    // Already recorded this week
    if (streaks.last_week_completed === weekStart) {
      return streaks;
    }
    
    let newWeeklyStreak = 1;
    
    // If last completed week was the previous week, increment streak
    if (streaks.last_week_completed === lastWeekStr) {
      newWeeklyStreak = streaks.current_weekly_streak + 1;
    }
    
    const longestWeekly = Math.max(newWeeklyStreak, streaks.longest_weekly_streak);
    
    const { data, error } = await supabase
      .from('user_streaks')
      .update({
        current_weekly_streak: newWeeklyStreak,
        longest_weekly_streak: longestWeekly,
        last_week_completed: weekStart
      })
      .eq('user_id', user.user.id)
      .select()
      .single();
    
    if (error) throw error;
    return data as UserStreaks;
  }
  
  // ============ QUARTERLY REVIEWS ============
  
  static getCurrentQuarter(): { year: number; quarter: number; quarterStart: string } {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    
    const quarterStartMonth = (quarter - 1) * 3;
    const quarterStart = new Date(year, quarterStartMonth, 1);
    
    return {
      year,
      quarter,
      quarterStart: quarterStart.toISOString().split('T')[0]
    };
  }
  
  static async getQuarterlyReview(year: number, quarter: number): Promise<QuarterlyReview | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;
    
    const { data, error } = await supabase
      .from('quarterly_reviews')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('year', year)
      .eq('quarter', quarter)
      .maybeSingle();
    
    if (error) throw error;
    return data as QuarterlyReview | null;
  }
  
  static async getAllQuarterlyReviews(): Promise<QuarterlyReview[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];
    
    const { data, error } = await supabase
      .from('quarterly_reviews')
      .select('*')
      .eq('user_id', user.user.id)
      .order('year', { ascending: false })
      .order('quarter', { ascending: false });
    
    if (error) throw error;
    return (data || []) as QuarterlyReview[];
  }
  
  static async createOrUpdateQuarterlyReview(review: CreateQuarterlyReview): Promise<QuarterlyReview> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');
    
    const { year, quarter } = review;
    const quarterStartMonth = (quarter - 1) * 3;
    const quarterStart = new Date(year, quarterStartMonth, 1).toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('quarterly_reviews')
      .upsert({
        user_id: user.user.id,
        quarter_start: quarterStart,
        ...review
      }, { onConflict: 'user_id,year,quarter' })
      .select()
      .single();
    
    if (error) throw error;
    return data as QuarterlyReview;
  }
  
  static async completeQuarterlyReview(year: number, quarter: number): Promise<QuarterlyReview> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('quarterly_reviews')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('user_id', user.user.id)
      .eq('year', year)
      .eq('quarter', quarter)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update quarterly streak after completing review
    await this.updateQuarterlyStreak(year, quarter);
    
    return data as QuarterlyReview;
  }
  
  static async updateQuarterlyStreak(year: number, quarter: number): Promise<UserStreaks> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');
    
    const quarterKey = `${year}-Q${quarter}`;
    
    // Calculate previous quarter
    let prevYear = year;
    let prevQuarter = quarter - 1;
    if (prevQuarter === 0) {
      prevQuarter = 4;
      prevYear = year - 1;
    }
    const prevQuarterKey = `${prevYear}-Q${prevQuarter}`;
    
    let streaks = await this.getStreaks();
    
    if (!streaks) {
      const { data, error } = await supabase
        .from('user_streaks')
        .insert({
          user_id: user.user.id,
          current_daily_streak: 0,
          longest_daily_streak: 0,
          current_weekly_streak: 0,
          longest_weekly_streak: 0,
          current_quarterly_streak: 1,
          longest_quarterly_streak: 1,
          last_quarter_completed: quarterKey
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as UserStreaks;
    }
    
    // Already recorded this quarter
    if (streaks.last_quarter_completed === quarterKey) {
      return streaks;
    }
    
    let newQuarterlyStreak = 1;
    
    // If last completed quarter was the previous quarter, increment streak
    if (streaks.last_quarter_completed === prevQuarterKey) {
      newQuarterlyStreak = (streaks.current_quarterly_streak || 0) + 1;
    }
    
    const longestQuarterly = Math.max(newQuarterlyStreak, streaks.longest_quarterly_streak || 0);
    
    const { data, error } = await supabase
      .from('user_streaks')
      .update({
        current_quarterly_streak: newQuarterlyStreak,
        longest_quarterly_streak: longestQuarterly,
        last_quarter_completed: quarterKey
      })
      .eq('user_id', user.user.id)
      .select()
      .single();
    
    if (error) throw error;
    return data as UserStreaks;
  }
  
  // ============ WEEKLY PLANNING SESSIONS ============

  static async getAllWeeklyPlanningSessions(): Promise<WeeklyPlanningSession[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];
    
    const { data, error } = await supabase
      .from('weekly_planning_sessions')
      .select('*')
      .eq('user_id', user.user.id)
      .order('week_start', { ascending: false });
    
    if (error) throw error;
    return (data || []) as WeeklyPlanningSession[];
  }
  
  static async getWeeklyPlanningSession(weekStart: string): Promise<WeeklyPlanningSession | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;
    
    const { data, error } = await supabase
      .from('weekly_planning_sessions')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('week_start', weekStart)
      .maybeSingle();
    
    if (error) throw error;
    return data as WeeklyPlanningSession | null;
  }
  
  static async createOrUpdatePlanningSession(session: CreateWeeklyPlanningSession): Promise<WeeklyPlanningSession> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('weekly_planning_sessions')
      .upsert({
        user_id: user.user.id,
        ...session
      }, { onConflict: 'user_id,week_start' })
      .select()
      .single();
    
    if (error) throw error;
    return data as WeeklyPlanningSession;
  }
  
  static async completePlanningSession(weekStart: string): Promise<WeeklyPlanningSession> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('weekly_planning_sessions')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('user_id', user.user.id)
      .eq('week_start', weekStart)
      .select()
      .single();
    
    if (error) throw error;
    return data as WeeklyPlanningSession;
  }
  
  // ============ HELPERS ============
  
  static isSunday(): boolean {
    return new Date().getDay() === 0;
  }
  
  static isEndOfWeek(): boolean {
    const day = new Date().getDay();
    return day === 5 || day === 6; // Friday or Saturday
  }
  
  static isEndOfQuarter(): boolean {
    const now = new Date();
    const month = now.getMonth();
    const date = now.getDate();
    const lastDayOfMonth = new Date(now.getFullYear(), month + 1, 0).getDate();
    
    // Last week of March, June, September, December
    const isQuarterEndMonth = [2, 5, 8, 11].includes(month);
    const isLastWeek = date >= lastDayOfMonth - 7;
    
    return isQuarterEndMonth && isLastWeek;
  }
}

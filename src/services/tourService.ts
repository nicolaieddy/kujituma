import { supabase } from "@/integrations/supabase/client";
import { UserTour } from "@/types/tour";

export class TourService {
  static async getUserTour(tourType: string = 'onboarding'): Promise<UserTour | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data: tour, error } = await supabase
      .from('user_tours')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('tour_type', tourType)
      .maybeSingle();

    if (error) throw error;
    return tour as UserTour | null;
  }

  static async createUserTour(tourType: string = 'onboarding'): Promise<UserTour> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data: tour, error } = await supabase
      .from('user_tours')
      .insert({
        user_id: user.user.id,
        tour_type: tourType,
        current_step: 0,
        is_completed: false
      })
      .select()
      .single();

    if (error) throw error;
    return tour as UserTour;
  }

  static async updateTourProgress(
    tourType: string, 
    currentStep: number, 
    isCompleted: boolean = false
  ): Promise<UserTour> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const updateData: any = {
      current_step: currentStep,
      is_completed: isCompleted
    };

    if (isCompleted) {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: tour, error } = await supabase
      .from('user_tours')
      .update(updateData)
      .eq('user_id', user.user.id)
      .eq('tour_type', tourType)
      .select()
      .single();

    if (error) throw error;
    return tour as UserTour;
  }

  static async dismissTour(tourType: string = 'onboarding'): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('user_tours')
      .update({
        dismissed_at: new Date().toISOString(),
        is_completed: true
      })
      .eq('user_id', user.user.id)
      .eq('tour_type', tourType);

    if (error) throw error;
  }

  static async resetUserTour(userId: string, tourType: string = 'onboarding'): Promise<void> {
    const { error } = await supabase
      .from('user_tours')
      .update({
        current_step: 0,
        is_completed: false,
        dismissed_at: null,
        completed_at: null
      })
      .eq('user_id', userId)
      .eq('tour_type', tourType);

    if (error) throw error;
  }

  static async shouldShowTour(): Promise<boolean> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    const tour = await this.getUserTour();
    
    // Show tour if no tour record exists or if tour is not completed/dismissed
    return !tour || (!tour.is_completed && !tour.dismissed_at);
  }

  static async restartTour(tourType: string = 'onboarding'): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Check if tour exists, if not create it, if yes reset it
    const existingTour = await this.getUserTour(tourType);
    
    if (existingTour) {
      await this.resetUserTour(user.user.id, tourType);
    } else {
      await this.createUserTour(tourType);
    }
  }
}
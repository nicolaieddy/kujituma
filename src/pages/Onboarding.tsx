import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  about_me?: string;
  country?: string;
  city?: string;
  is_profile_complete?: boolean;
}

const Onboarding = () => {
  const { user, loading: authLoading, isNewUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    // If not authenticated, redirect to auth
    if (!user) {
      navigate('/auth');
      return;
    }

    // If not a new user, redirect to goals
    if (!isNewUser) {
      navigate('/goals');
      return;
    }

    // Fetch profile data
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, about_me, country, city, is_profile_complete')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, authLoading, isNewUser, navigate]);

  const handleComplete = () => {
    // Navigation is handled in the wizard
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <Skeleton className="h-2 w-full" />
            <div className="flex justify-center gap-2 pt-4">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
            <Skeleton className="h-6 w-32 mx-auto mt-4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <Skeleton className="h-24 w-24 rounded-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return <OnboardingWizard profile={profile} onComplete={handleComplete} />;
};

export default Onboarding;

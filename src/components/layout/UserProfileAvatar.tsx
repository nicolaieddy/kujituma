import { useState, useEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lightweightCache } from "@/services/lightweightCache";
import { Skeleton } from "@/components/ui/skeleton";

interface UserProfile {
  avatar_url?: string;
  full_name: string;
}

interface UserProfileAvatarProps {
  className?: string;
}

export const UserProfileAvatar = ({ className = "h-9 w-9" }: UserProfileAvatarProps) => {
  const { user, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) {
        setUserProfile(null);
        setIsLoading(false);
        return;
      }

      // Check lightweight cache first
      const cacheKey = lightweightCache.keys.userProfile(user.id);
      const cached = lightweightCache.get<UserProfile>(cacheKey);
      
      if (cached) {
        setUserProfile(cached);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url, full_name')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setUserProfile(data);
          // Cache for 5 minutes
          lightweightCache.set(cacheKey, data, 5 * 60 * 1000);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [user?.id]);

  const getInitials = useMemo(() => (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  }, []);

  // Show skeleton while auth is loading or profile is loading
  if (authLoading || isLoading) {
    return <Skeleton className={`${className} rounded-full`} />;
  }

  return (
    <Avatar className={className}>
      <AvatarImage src={userProfile?.avatar_url || undefined} />
      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
        {userProfile?.full_name ? getInitials(userProfile.full_name) : <User className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  );
};

export const useUserProfile = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) {
        setUserProfile(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url, full_name')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [user?.id]);

  return userProfile;
};
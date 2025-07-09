import { useState, useEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lightweightCache } from "@/services/lightweightCache";

interface UserProfile {
  avatar_url?: string;
  full_name: string;
}

interface UserProfileAvatarProps {
  className?: string;
}

export const UserProfileAvatar = ({ className = "h-9 w-9" }: UserProfileAvatarProps) => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      // Check lightweight cache first
      const cacheKey = lightweightCache.keys.userProfile(user.id);
      const cached = lightweightCache.get<UserProfile>(cacheKey);
      
      if (cached) {
        setUserProfile(cached);
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
      }
    };

    fetchUserProfile();
  }, [user]);

  const getInitials = useMemo(() => (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  }, []);

  return (
    <Avatar className={className}>
      <AvatarImage src={userProfile?.avatar_url || undefined} />
      <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm">
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
      if (!user) return;

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
  }, [user]);

  return userProfile;
};
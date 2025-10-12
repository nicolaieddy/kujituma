import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { ProfilePublicView } from "@/components/profile/ProfilePublicView";
import { Button } from "@/components/ui/button";
import { Edit3, Eye } from "lucide-react";

interface Profile {
  id: string;
  email?: string; // Optional for non-owners
  full_name: string;
  avatar_url?: string;
  about_me?: string;
  linkedin_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  twitter_url?: string;
  created_at: string;
  last_active_at?: string;
  show_email?: boolean;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams();
  const { isAdmin } = useAdminStatus();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Determine if viewing own profile or someone else's
  const isOwnProfile = !userId || userId === user?.id;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const targetUserId = userId || user?.id;
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      try {
        // Determine which columns to select based on viewer relationship
        const isOwner = user?.id === targetUserId;
        const isAuthenticated = !!user;
        
        let selectColumns = '';
        
        if (isOwner) {
          // Owner gets all columns
          selectColumns = '*';
        } else if (isAuthenticated) {
          // Authenticated users get limited data (respect show_email)
          selectColumns = 'id, full_name, avatar_url, about_me, linkedin_url, instagram_url, tiktok_url, twitter_url, created_at, last_active_at, show_email, email';
        } else {
          // Anonymous users get minimal data
          selectColumns = 'id, full_name, avatar_url, about_me, created_at';
        }

        const { data, error } = await supabase
          .from('profiles')
          .select(selectColumns)
          .eq('id', targetUserId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
          setLoading(false);
          return;
        }

        if (!data) {
          setLoading(false);
          return;
        }

        // Filter email based on show_email preference for non-owners
        const profileData: any = data;
        if (!isOwner && profileData?.show_email === false) {
          const { email, ...dataWithoutEmail } = profileData;
          setProfile(dataWithoutEmail as Profile);
        } else {
          setProfile(profileData as Profile);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have a user context established or a specific userId
    if (user !== null || userId) {
      fetchProfile();
    }
  }, [user, userId]);

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
    setIsEditing(false);
  };

  if (!user && isOwnProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-secondary">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-white">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-secondary">
        <DashboardHeader isAdmin={isAdmin} onSignOut={handleSignOut} />
        <div className="flex items-center justify-center min-h-[80vh]">
          <p className="text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-secondary">
      <DashboardHeader isAdmin={isAdmin} onSignOut={handleSignOut} />
      
      <div className="container mx-auto px-4 py-8">
        {profile && (
          <>
            <ProfileHeader profile={profile} />
            
            {isOwnProfile && (
              <div className="mt-8 flex justify-center gap-4">
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  variant={isEditing ? "secondary" : "default"}
                  className="flex items-center gap-2"
                >
                  {isEditing ? (
                    <>
                      <Eye className="h-4 w-4" />
                      Preview
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-4 w-4" />
                      Edit Profile
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="mt-8">
              {isOwnProfile && isEditing ? (
                <ProfileEditForm
                  profile={profile}
                  onUpdate={handleProfileUpdate}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <ProfilePublicView profile={profile} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
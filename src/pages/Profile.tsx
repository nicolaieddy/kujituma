import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { supabase } from "@/integrations/supabase/client";
import { accountabilityService } from "@/services/accountabilityService";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { ProfilePublicView } from "@/components/profile/ProfilePublicView";
import { OfflineFallback } from "@/components/pwa/OfflineFallback";
import { ProfileSkeleton } from "@/components/skeletons/PageSkeletons";
import { Button } from "@/components/ui/button";
import { Edit3 } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  cover_photo_url?: string;
  cover_photo_position?: number;
  about_me?: string;
  linkedin_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  twitter_url?: string;
  created_at: string;
  last_active_at?: string;
}

interface FriendshipStatus {
  is_friend: boolean;
  friend_request_status?: 'sent' | 'received';
  request_id?: string;
}

interface PartnershipStatus {
  is_partner: boolean;
  partnership_id?: string;
  can_view_partner_goals?: boolean;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams();
  const { isAdmin } = useAdminStatus();
  const { isOffline } = useOfflineStatus();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>({ is_friend: false });
  const [partnershipStatus, setPartnershipStatus] = useState<PartnershipStatus>({ is_partner: false });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Determine if viewing own profile or someone else's
  const isOwnProfile = !userId || userId === user?.id;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  useEffect(() => {
    const fetchProfileData = async () => {
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
          // Authenticated users get limited data
          selectColumns = 'id, full_name, avatar_url, cover_photo_url, cover_photo_position, about_me, linkedin_url, instagram_url, tiktok_url, twitter_url, created_at, last_active_at';
        } else {
          // Anonymous users get minimal data
          selectColumns = 'id, full_name, avatar_url, cover_photo_url, cover_photo_position, about_me, created_at';
        }

        // Fetch profile, friendship status, and partnership status in parallel
        const [profileResult, friendshipResult, partnershipResult] = await Promise.all([
          supabase
            .from('profiles')
            .select(selectColumns)
            .eq('id', targetUserId)
            .maybeSingle(),
          
          // Only fetch friendship status if viewing someone else's profile and authenticated
          isAuthenticated && !isOwner
            ? (async () => {
                // Check if friends
                const { data: friendData } = await supabase
                  .from('friends')
                  .select('*')
                  .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
                  .or(`user1_id.eq.${targetUserId},user2_id.eq.${targetUserId}`)
                  .maybeSingle();

                if (friendData) {
                  return { is_friend: true };
                }

                // Check for pending friend requests
                const { data: requestData } = await supabase
                  .from('friend_requests')
                  .select('id, sender_id, receiver_id, status')
                  .eq('status', 'pending')
                  .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                  .or(`sender_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`)
                  .maybeSingle();

                if (requestData) {
                  if (requestData.sender_id === user.id) {
                    return { is_friend: false, friend_request_status: 'sent' as const, request_id: requestData.id };
                  } else {
                    return { is_friend: false, friend_request_status: 'received' as const, request_id: requestData.id };
                  }
                }

                return { is_friend: false };
              })()
            : Promise.resolve({ is_friend: false }),
          
          // Check if this user is an accountability partner
          isAuthenticated && !isOwner
            ? accountabilityService.getPartnershipDetails(targetUserId).then(partnership => {
                if (partnership) {
                  return {
                    is_partner: true,
                    partnership_id: partnership.id,
                    can_view_partner_goals: partnership.can_view_partner_goals,
                  };
                }
                return { is_partner: false };
              }).catch(() => ({ is_partner: false }))
            : Promise.resolve({ is_partner: false })
        ]);

        const { data: profileData, error: profileError } = profileResult;

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setLoading(false);
          return;
        }

        if (!profileData) {
          setLoading(false);
          return;
        }

        setProfile(profileData as any);

        // Set friendship and partnership status
        setFriendshipStatus(friendshipResult);
        setPartnershipStatus(partnershipResult);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have a user context established or a specific userId
    if (user !== null || userId) {
      fetchProfileData();
    }
  }, [user, userId]);

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
    setIsEditing(false);
  };

  if (!user && isOwnProfile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-foreground">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  if (isOffline && !profile) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader isAdmin={isAdmin} onSignOut={handleSignOut} />
        <OfflineFallback 
          title="Profile unavailable offline"
          description="Profile data requires an internet connection to load. Please reconnect to view this profile."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader isAdmin={isAdmin} onSignOut={handleSignOut} />
        <div className="container mx-auto px-4 py-8">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader isAdmin={isAdmin} onSignOut={handleSignOut} />
      
      <div className="container mx-auto px-4 py-8">
        {profile && (
          <>
            {isOwnProfile && !isEditing && (
              <div className="max-w-4xl mx-auto mb-4 flex justify-end">
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
            )}

            {isOwnProfile && isEditing ? (
              <ProfileEditForm
                profile={profile}
                onUpdate={handleProfileUpdate}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <ProfilePublicView 
                profile={profile} 
                friendshipStatus={friendshipStatus}
                partnershipStatus={partnershipStatus}
                onFriendshipChange={setFriendshipStatus}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
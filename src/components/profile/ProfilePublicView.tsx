import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Calendar, Clock, UserPlus, UserMinus, UserCheck } from "lucide-react";
import { formatTimeAgo } from "@/utils/timeUtils";
import { ProfileGoals } from "./ProfileGoals";
import { ProfileStats } from "./ProfileStats";
import { UnfriendConfirmDialog } from "./UnfriendConfirmDialog";
import { SocialLinksDisplay } from "./SocialLinksDisplay";
import { SOCIAL_PLATFORMS } from "./SocialLinkPicker";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/hooks/useFriends";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  email?: string;
  full_name: string;
  avatar_url?: string;
  cover_photo_url?: string;
  cover_photo_position?: number;
  about_me?: string;
  linkedin_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  twitter_url?: string;
  show_email?: boolean;
  social_links_order?: string[];
  created_at: string;
  last_active_at?: string;
}

interface FriendshipStatus {
  is_friend: boolean;
  friend_request_status?: 'sent' | 'received';
  request_id?: string;
}

interface ProfilePublicViewProps {
  profile: Profile;
  friendshipStatus?: FriendshipStatus;
  onFriendshipChange?: (status: FriendshipStatus) => void;
}

export const ProfilePublicView = ({ profile, friendshipStatus, onFriendshipChange }: ProfilePublicViewProps) => {
  const { user } = useAuth();
  const [showUnfriendDialog, setShowUnfriendDialog] = useState(false);
  const isOwnProfile = user?.id === profile.id;
  const { is_friend, friend_request_status } = friendshipStatus || { is_friend: false };
  const { sendFriendRequest: sendFriendRequestBase, respondToFriendRequest: respondBase, removeFriend: removeFriendBase } = useFriends();

  const handleSendFriendRequest = async () => {
    await sendFriendRequestBase(profile.id);
    onFriendshipChange?.({ is_friend: false, friend_request_status: 'sent' });
  };

  const handleRespondToRequest = async (response: 'accepted' | 'rejected') => {
    await respondBase(friendshipStatus?.request_id || '', response);
    if (response === 'accepted') {
      onFriendshipChange?.({ is_friend: true });
    } else {
      onFriendshipChange?.({ is_friend: false });
    }
  };

  const handleUnfriend = async () => {
    setShowUnfriendDialog(false);
    await removeFriendBase(profile.id);
    onFriendshipChange?.({ is_friend: false });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="glass-card shadow-elegant hover:shadow-lift transition-all overflow-hidden">
        {/* Cover Photo */}
        <div 
          className="h-32 sm:h-40 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 relative"
          style={profile.cover_photo_url ? {
            backgroundImage: `url(${profile.cover_photo_url})`,
            backgroundSize: 'cover',
            backgroundPosition: `center ${profile.cover_photo_position ?? 50}%`
          } : undefined}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
        
        {/* Profile Header - Overlapping avatar */}
        <div className="px-6 sm:px-8 pb-6 -mt-16 relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl font-bold text-foreground mb-1 font-heading">{profile.full_name}</h1>
              {profile.show_email && profile.email && (
                <p className="text-muted-foreground">{profile.email}</p>
              )}
              
              {/* Social links inline */}
              {(() => {
                const socialLinks: Record<string, string> = {};
                SOCIAL_PLATFORMS.forEach(platform => {
                  const value = (profile as any)[platform.id];
                  if (typeof value === 'string' && value) {
                    socialLinks[platform.id] = value;
                  }
                });
                return Object.keys(socialLinks).length > 0 ? (
                  <div className="mt-3">
                    <SocialLinksDisplay socialLinks={socialLinks} linkOrder={profile.social_links_order} size="sm" />
                  </div>
                ) : null;
              })()}
            </div>

            {/* Friendship Actions */}
            {!isOwnProfile && user && (
              <div className="flex-shrink-0">
                {is_friend ? (
                  <Button
                    variant="outline"
                    className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 transition-all"
                    onClick={() => setShowUnfriendDialog(true)}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Friends
                  </Button>
                ) : friend_request_status === 'sent' ? (
                  <Button
                    variant="outline"
                    className="bg-accent/50 border-accent text-accent-foreground"
                    disabled
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Request Sent
                  </Button>
                ) : friend_request_status === 'received' ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 transition-all"
                      onClick={() => handleRespondToRequest('accepted')}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 transition-all"
                      onClick={() => handleRespondToRequest('rejected')}
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="bg-secondary/50 border-secondary text-secondary-foreground hover:bg-secondary transition-all"
                    onClick={handleSendFriendRequest}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Friend
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* Profile Stats */}
          <div className="mt-6">
            <ProfileStats userId={profile.id} />
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 pt-0">

          {/* About Me Section */}
          {profile.about_me && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">About</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {profile.about_me}
              </p>
            </div>
          )}

          {/* Member Info */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-primary" />
              <span>Joined {formatDate(profile.created_at)}</span>
            </div>
            
            {profile.last_active_at && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-primary" />
                <span>Active {formatTimeAgo(new Date(profile.last_active_at).getTime())}</span>
              </div>
            )}
            
            {isOwnProfile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newShowEmail = !profile.show_email;
                  supabase
                    .from('profiles')
                    .update({ show_email: newShowEmail })
                    .eq('id', profile.id)
                    .then(() => {
                      window.location.reload();
                    });
                }}
                className="text-xs h-auto py-1 px-2"
              >
                {profile.show_email ? 'Hide Email' : 'Show Email'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Goals Section */}
      <ProfileGoals userId={profile.id} isOwnProfile={isOwnProfile} />
      
      {/* Unfriend Confirmation Dialog */}
      <UnfriendConfirmDialog
        isOpen={showUnfriendDialog}
        onOpenChange={setShowUnfriendDialog}
        onConfirm={handleUnfriend}
        friendName={profile.full_name}
      />
    </div>
  );
};

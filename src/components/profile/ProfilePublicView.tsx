import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Calendar, Clock, ExternalLink, UserPlus, UserMinus, UserCheck } from "lucide-react";
import linkedinIcon from "@/assets/linkedin-icon.png";
import instagramIcon from "@/assets/instagram-icon.png";
import xIcon from "@/assets/x-icon.png";
import tiktokIcon from "@/assets/tiktok-icon.png";
import { formatTimeAgo } from "@/utils/timeUtils";
import { ProfileGoals } from "./ProfileGoals";
import { UnfriendConfirmDialog } from "./UnfriendConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useFriendshipStatus } from "@/hooks/useFriendshipStatus";
import { useFriends } from "@/hooks/useFriends";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  email?: string; // Optional - only visible based on show_email setting
  full_name: string;
  avatar_url?: string;
  about_me?: string;
  linkedin_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  twitter_url?: string;
  show_email?: boolean;
  created_at: string;
  last_active_at?: string;
}

interface ProfilePublicViewProps {
  profile: Profile;
}

export const ProfilePublicView = ({ profile }: ProfilePublicViewProps) => {
  const { user } = useAuth();
  const [showUnfriendDialog, setShowUnfriendDialog] = useState(false);
  const isOwnProfile = user?.id === profile.id;
  const { is_friend, friend_request_status, loading: statusLoading } = useFriendshipStatus(profile.id);
  const { sendFriendRequest, respondToFriendRequest, removeFriend } = useFriends();

  const handleUnfriend = () => {
    setShowUnfriendDialog(false);
    removeFriend(profile.id);
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
      <Card className="bg-slate-800/40 backdrop-blur-lg border-slate-700/50">
        <CardContent className="p-8">
          {/* Profile Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Avatar className="h-32 w-32 border-4 border-white/20">
                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-4xl">
                  <User className="h-16 w-16" />
                </AvatarFallback>
              </Avatar>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{profile.full_name}</h1>
            
            {/* Friendship Actions */}
            {!isOwnProfile && user && !statusLoading && (
              <div className="flex justify-center mt-4">
                {is_friend ? (
                  <Button
                    variant="outline"
                    className="bg-green-500/20 border-green-400 text-green-400 hover:bg-green-500/30"
                    onClick={() => setShowUnfriendDialog(true)}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Friends
                  </Button>
                ) : friend_request_status === 'sent' ? (
                  <Button
                    variant="outline"
                    className="bg-yellow-500/20 border-yellow-400 text-yellow-400"
                    disabled
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Request Sent
                  </Button>
                ) : friend_request_status === 'received' ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="bg-green-500/20 border-green-400 text-green-400 hover:bg-green-500/30"
                      onClick={() => respondToFriendRequest(profile.id, 'accepted')}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-red-500/20 border-red-400 text-red-400 hover:bg-red-500/30"
                      onClick={() => respondToFriendRequest(profile.id, 'rejected')}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="bg-blue-500/20 border-blue-400 text-blue-400 hover:bg-blue-500/30"
                    onClick={() => sendFriendRequest(profile.id)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Friend
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* About Me Section */}
          {profile.about_me && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">About Me</h2>
              <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                {profile.about_me}
              </p>
            </div>
          )}

          {/* Social Media Links */}
          {(profile.linkedin_url || profile.instagram_url || profile.tiktok_url || profile.twitter_url) && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Connect</h2>
              <div className="flex flex-wrap gap-3">
                {profile.linkedin_url && (
                  <Button
                    variant="outline"
                    className="bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30 hover:border-blue-400/70 transition-all duration-200"
                    onClick={() => window.open(profile.linkedin_url, '_blank')}
                  >
                    <img src={linkedinIcon} alt="LinkedIn" className="h-4 w-4 mr-2 filter brightness-0 invert" />
                    LinkedIn
                  </Button>
                )}
                {profile.instagram_url && (
                  <Button
                    variant="outline"
                    className="bg-pink-600/20 border-pink-500/50 text-pink-300 hover:bg-pink-600/30 hover:border-pink-400/70 transition-all duration-200"
                    onClick={() => window.open(profile.instagram_url, '_blank')}
                  >
                    <img src={instagramIcon} alt="Instagram" className="h-4 w-4 mr-2 filter brightness-0 invert" />
                    Instagram
                  </Button>
                )}
                {profile.tiktok_url && (
                  <Button
                    variant="outline"
                    className="bg-purple-600/20 border-purple-500/50 text-purple-300 hover:bg-purple-600/30 hover:border-purple-400/70 transition-all duration-200"
                    onClick={() => window.open(profile.tiktok_url, '_blank')}
                  >
                    <img src={tiktokIcon} alt="TikTok" className="h-4 w-4 mr-2 filter brightness-0 invert" />
                    TikTok
                  </Button>
                )}
                {profile.twitter_url && (
                  <Button
                    variant="outline"
                    className="bg-slate-600/20 border-slate-500/50 text-slate-300 hover:bg-slate-600/30 hover:border-slate-400/70 transition-all duration-200"
                    onClick={() => window.open(profile.twitter_url, '_blank')}
                  >
                    <img src={xIcon} alt="X" className="h-4 w-4 mr-2 filter brightness-0 invert" />
                    X
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Member Info */}
          <div className="border-t border-white/20 pt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Member Information</h2>
              {isOwnProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newShowEmail = !profile.show_email;
                    // Update profile in database
                    supabase
                      .from('profiles')
                      .update({ show_email: newShowEmail })
                      .eq('id', profile.id)
                      .then(() => {
                        // Force page refresh to show updated state
                        window.location.reload();
                      });
                  }}
                  className="bg-blue-500/20 border-blue-400/50 text-blue-300 hover:bg-blue-500/30 text-xs"
                >
                  {profile.show_email ? 'Hide Email' : 'Show Email'}
                </Button>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center text-white/80">
                <Calendar className="h-5 w-5 mr-3 text-purple-400" />
                <span>Member since {formatDate(profile.created_at)}</span>
              </div>
              
              {profile.show_email && profile.email && (
                <div className="flex items-center text-white/80">
                  <User className="h-5 w-5 mr-3 text-green-400" />
                  <span>{profile.email}</span>
                </div>
              )}
              
              {profile.last_active_at && (
                <div className="flex items-center text-white/80">
                  <Clock className="h-5 w-5 mr-3 text-blue-400" />
                  <span>Last active {formatTimeAgo(new Date(profile.last_active_at).getTime())}</span>
                </div>
              )}
            </div>
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
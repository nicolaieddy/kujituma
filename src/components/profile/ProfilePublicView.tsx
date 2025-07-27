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
import { useAuth } from "@/contexts/AuthContext";
import { useFriendshipStatus } from "@/hooks/useFriendshipStatus";
import { useFriends } from "@/hooks/useFriends";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  about_me?: string;
  linkedin_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  twitter_url?: string;
  created_at: string;
  last_active_at?: string;
}

interface ProfilePublicViewProps {
  profile: Profile;
}

export const ProfilePublicView = ({ profile }: ProfilePublicViewProps) => {
  const { user } = useAuth();
  const isOwnProfile = user?.id === profile.id;
  const { is_friend, friend_request_status, loading: statusLoading } = useFriendshipStatus(profile.id);
  const { sendFriendRequest, respondToFriendRequest, removeFriend } = useFriends();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <Card className="bg-background/80 backdrop-blur-sm border-border/30 shadow-lg">
          <CardContent className="p-10">
            {/* Profile Header */}
            <div className="text-center mb-10">
              <div className="flex justify-center mb-6">
                <Avatar className="h-40 w-40 border-4 border-primary/20 shadow-2xl">
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-background text-5xl">
                    <User className="h-20 w-20" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-3">{profile.full_name}</h1>
            
              {/* Friendship Actions */}
              {!isOwnProfile && user && !statusLoading && (
                <div className="flex justify-center mt-6">
                  {is_friend ? (
                    <Button
                      variant="outline"
                      className="bg-accent/10 border-accent/50 text-accent hover:bg-accent/20 transition-all duration-300 shadow-lg"
                      onClick={() => removeFriend(profile.id)}
                    >
                      <UserCheck className="h-5 w-5 mr-2" />
                      Friends
                    </Button>
                  ) : friend_request_status === 'sent' ? (
                    <Button
                      variant="outline"
                      className="bg-muted border-muted-foreground/30 text-muted-foreground"
                      disabled
                    >
                      <UserPlus className="h-5 w-5 mr-2" />
                      Request Sent
                    </Button>
                  ) : friend_request_status === 'received' ? (
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="bg-accent/10 border-accent/50 text-accent hover:bg-accent/20 transition-all duration-300"
                        onClick={() => respondToFriendRequest(profile.id, 'accepted')}
                      >
                        <UserCheck className="h-5 w-5 mr-2" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        className="bg-destructive/10 border-destructive/50 text-destructive hover:bg-destructive/20 transition-all duration-300"
                        onClick={() => respondToFriendRequest(profile.id, 'rejected')}
                      >
                        <UserMinus className="h-5 w-5 mr-2" />
                        Decline
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="bg-primary/10 border-primary/50 text-primary hover:bg-primary/20 transition-all duration-300 shadow-lg"
                      onClick={() => sendFriendRequest(profile.id)}
                    >
                      <UserPlus className="h-5 w-5 mr-2" />
                      Add Friend
                    </Button>
                  )}
                </div>
              )}
          </div>

            {/* About Me Section */}
            {profile.about_me && (
              <div className="mb-10">
                <h2 className="text-2xl font-semibold text-foreground mb-6 border-b border-border/30 pb-2">About Me</h2>
                <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap text-lg">
                  {profile.about_me}
                </p>
              </div>
            )}

            {/* Social Media Links */}
            {(profile.linkedin_url || profile.instagram_url || profile.tiktok_url || profile.twitter_url) && (
              <div className="mb-10">
                <h2 className="text-2xl font-semibold text-foreground mb-6 border-b border-border/30 pb-2">Connect</h2>
                <div className="flex flex-wrap gap-4">
                  {profile.linkedin_url && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="bg-social-linkedin/10 border-social-linkedin/30 text-social-linkedin hover:bg-social-linkedin/20 hover:border-social-linkedin/50 hover:scale-105 transition-all duration-300 shadow-lg"
                      onClick={() => window.open(profile.linkedin_url, '_blank')}
                    >
                      <img src={linkedinIcon} alt="LinkedIn" className="h-5 w-5 mr-3" />
                      LinkedIn
                    </Button>
                  )}
                  {profile.instagram_url && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="bg-social-instagram/10 border-social-instagram/30 text-social-instagram hover:bg-social-instagram/20 hover:border-social-instagram/50 hover:scale-105 transition-all duration-300 shadow-lg"
                      onClick={() => window.open(profile.instagram_url, '_blank')}
                    >
                      <img src={instagramIcon} alt="Instagram" className="h-5 w-5 mr-3" />
                      Instagram
                    </Button>
                  )}
                  {profile.tiktok_url && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="bg-social-tiktok/10 border-social-tiktok/30 text-social-tiktok hover:bg-social-tiktok/20 hover:border-social-tiktok/50 hover:scale-105 transition-all duration-300 shadow-lg"
                      onClick={() => window.open(profile.tiktok_url, '_blank')}
                    >
                      <img src={tiktokIcon} alt="TikTok" className="h-5 w-5 mr-3" />
                      TikTok
                    </Button>
                  )}
                  {profile.twitter_url && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="bg-social-twitter/10 border-social-twitter/30 text-social-twitter hover:bg-social-twitter/20 hover:border-social-twitter/50 hover:scale-105 transition-all duration-300 shadow-lg"
                      onClick={() => window.open(profile.twitter_url, '_blank')}
                    >
                      <img src={xIcon} alt="X" className="h-5 w-5 mr-3" />
                      X
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Member Info */}
            <div className="border-t border-border/30 pt-8">
              <h2 className="text-2xl font-semibold text-foreground mb-6">Member Information</h2>
              <div className="space-y-4">
                <div className="flex items-center text-foreground/70 text-lg">
                  <Calendar className="h-6 w-6 mr-4 text-primary" />
                  <span>Member since {formatDate(profile.created_at)}</span>
                </div>
                {profile.last_active_at && (
                  <div className="flex items-center text-foreground/70 text-lg">
                    <Clock className="h-6 w-6 mr-4 text-accent" />
                    <span>Last active {formatTimeAgo(new Date(profile.last_active_at).getTime())}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals Section */}
        <ProfileGoals userId={profile.id} isOwnProfile={isOwnProfile} />
      </div>
    </div>
  );
};
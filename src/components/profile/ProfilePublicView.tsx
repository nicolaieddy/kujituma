import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Calendar, Clock, ExternalLink, UserPlus, UserMinus, UserCheck, Users } from "lucide-react";
import linkedinIcon from "@/assets/linkedin-icon.png";
import instagramIcon from "@/assets/instagram-icon.png";
import xIcon from "@/assets/x-icon.png";
import tiktokIcon from "@/assets/tiktok-icon.png";
import { formatTimeAgo } from "@/utils/timeUtils";
import { ProfileGoals } from "./ProfileGoals";
import { UnfriendConfirmDialog } from "./UnfriendConfirmDialog";
import { CommitmentCard } from "@/components/commitments/CommitmentCard";
import { useAuth } from "@/contexts/AuthContext";
import { useFriendshipStatus } from "@/hooks/useFriendshipStatus";
import { useFriends } from "@/hooks/useFriends";
import { supabase } from "@/integrations/supabase/client";
import { commitmentsService, PublicCommitment } from "@/services/commitmentsService";
import { accountabilityService } from "@/services/accountabilityService";
import { WeeklyProgressService } from "@/services/weeklyProgressService";
import { toast } from "sonner";

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
  const [commitments, setCommitments] = useState<PublicCommitment[]>([]);
  const [hasPartner, setHasPartner] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);
  const isOwnProfile = user?.id === profile.id;
  const { is_friend, friend_request_status, loading: statusLoading } = useFriendshipStatus(profile.id);
  const { sendFriendRequest, respondToFriendRequest, removeFriend } = useFriends();

  const currentWeekStart = WeeklyProgressService.getWeekStart();

  useEffect(() => {
    const loadCommitments = async () => {
      if (user && is_friend) {
        const data = await commitmentsService.getPublicCommitments(profile.id, currentWeekStart);
        setCommitments(data);
      }
    };

    const checkPartnership = async () => {
      const partner = await accountabilityService.getAccountabilityPartner();
      setHasPartner(!!partner);
    };

    const checkPendingRequest = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('accountability_partner_requests')
        .select('*')
        .eq('sender_id', user.id)
        .eq('receiver_id', profile.id)
        .eq('status', 'pending')
        .maybeSingle();
      
      setPendingRequest(!!data);
    };

    loadCommitments();
    if (user) {
      checkPartnership();
      checkPendingRequest();
    }
  }, [profile.id, user, is_friend, currentWeekStart]);

  const handleSendPartnerRequest = async () => {
    setIsSendingRequest(true);
    const result = await accountabilityService.sendPartnerRequest(
      profile.id,
      `Hi ${profile.full_name}! Would you like to be accountability partners?`
    );

    if (result.success) {
      toast.success('🤝 Accountability partner request sent!');
      setPendingRequest(true);
    } else {
      toast.error(result.error || 'Failed to send request');
    }
    setIsSendingRequest(false);
  };

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
      <Card className="glass-card shadow-elegant hover:shadow-lift transition-all">

        <CardContent className="p-8">
          {/* Profile Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Avatar className="h-32 w-32 border-4 border-border">
                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                  <User className="h-16 w-16" />
                </AvatarFallback>
              </Avatar>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2 font-serif">{profile.full_name}</h1>
            
            {/* Friendship Actions */}
            {!isOwnProfile && user && !statusLoading && (
              <div className="flex flex-col items-center gap-2 mt-4">
                <div className="flex justify-center">
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
                        className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 transition-all"
                        onClick={() => respondToFriendRequest(profile.id, 'accepted')}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        className="bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 transition-all"
                        onClick={() => respondToFriendRequest(profile.id, 'rejected')}
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="bg-secondary/50 border-secondary text-secondary-foreground hover:bg-secondary transition-all"
                      onClick={() => sendFriendRequest(profile.id)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Friend
                    </Button>
                  )}
                </div>
                
                {/* Accountability Partner Request */}
                {is_friend && !hasPartner && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={pendingRequest ? "bg-accent/50 border-accent text-accent-foreground" : "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"}
                    onClick={handleSendPartnerRequest}
                    disabled={isSendingRequest || pendingRequest}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {isSendingRequest ? 'Sending...' : pendingRequest ? 'Request Pending' : 'Become Accountability Partners'}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* About Me Section */}
          {profile.about_me && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">About Me</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {profile.about_me}
              </p>
            </div>
          )}

          {/* Social Media Links */}
          {(profile.linkedin_url || profile.instagram_url || profile.tiktok_url || profile.twitter_url) && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Connect</h2>
              <div className="flex flex-wrap gap-3">
                {profile.linkedin_url && (
                  <Button
                    variant="outline"
                    className="bg-secondary/50 border-secondary text-secondary-foreground hover:bg-secondary hover:shadow-md transition-all"
                    onClick={() => window.open(profile.linkedin_url, '_blank')}
                  >
                    <img src={linkedinIcon} alt="LinkedIn" className="h-4 w-4 mr-2 opacity-70" />
                    LinkedIn
                  </Button>
                )}
                {profile.instagram_url && (
                  <Button
                    variant="outline"
                    className="bg-accent/50 border-accent text-accent-foreground hover:bg-accent hover:shadow-md transition-all"
                    onClick={() => window.open(profile.instagram_url, '_blank')}
                  >
                    <img src={instagramIcon} alt="Instagram" className="h-4 w-4 mr-2 opacity-70" />
                    Instagram
                  </Button>
                )}
                {profile.tiktok_url && (
                  <Button
                    variant="outline"
                    className="bg-secondary/50 border-secondary text-secondary-foreground hover:bg-secondary hover:shadow-md transition-all"
                    onClick={() => window.open(profile.tiktok_url, '_blank')}
                  >
                    <img src={tiktokIcon} alt="TikTok" className="h-4 w-4 mr-2 opacity-70" />
                    TikTok
                  </Button>
                )}
                {profile.twitter_url && (
                  <Button
                    variant="outline"
                    className="bg-muted border-border text-foreground hover:bg-muted/80 hover:shadow-md transition-all"
                    onClick={() => window.open(profile.twitter_url, '_blank')}
                  >
                    <img src={xIcon} alt="X" className="h-4 w-4 mr-2 opacity-70" />
                    X
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Member Info */}
          <div className="border-t border-border pt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Member Information</h2>
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
                  className="bg-secondary/50 border-secondary text-secondary-foreground hover:bg-secondary transition-all text-xs"
                >
                  {profile.show_email ? 'Hide Email' : 'Show Email'}
                </Button>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center text-muted-foreground">
                <Calendar className="h-5 w-5 mr-3 text-primary" />
                <span>Member since {formatDate(profile.created_at)}</span>
              </div>
              
              {profile.show_email && profile.email && (
                <div className="flex items-center text-muted-foreground">
                  <User className="h-5 w-5 mr-3 text-primary" />
                  <span>{profile.email}</span>
                </div>
              )}
              
              {profile.last_active_at && (
                <div className="flex items-center text-muted-foreground">
                  <Clock className="h-5 w-5 mr-3 text-primary" />
                  <span>Last active {formatTimeAgo(new Date(profile.last_active_at).getTime())}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commitments Section */}
      {commitments.length > 0 && (
        <CommitmentCard commitments={commitments} userName={profile.full_name} />
      )}

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
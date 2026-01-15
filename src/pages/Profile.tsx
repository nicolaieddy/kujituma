import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { supabase } from "@/integrations/supabase/client";
import { accountabilityService } from "@/services/accountabilityService";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { IntegrationsSection } from "@/components/profile/IntegrationsSection";
import { OfflineFallback } from "@/components/pwa/OfflineFallback";
import { ProfileSkeleton } from "@/components/skeletons/PageSkeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileGoals } from "@/components/profile/ProfileGoals";
import { SocialLinksDisplay } from "@/components/profile/SocialLinksDisplay";
import { SOCIAL_PLATFORMS } from "@/components/profile/SocialLinkPicker";
import { UnfriendConfirmDialog } from "@/components/profile/UnfriendConfirmDialog";
import { formatTimeAgo } from "@/utils/timeUtils";
import {
  Edit3,
  User,
  Zap,
  Calendar,
  Clock,
  UserPlus,
  UserMinus,
  UserCheck,
  Users,
  ArrowRight,
  Handshake,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useFriends } from "@/hooks/useFriends";
import { useAccountabilityPartners } from "@/hooks/useAccountabilityPartners";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

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
  social_links_order?: string[];
  created_at: string;
  last_active_at?: string;
}

interface FriendshipStatus {
  is_friend: boolean;
  friend_request_status?: "sent" | "received";
  request_id?: string;
}

interface PartnershipStatus {
  is_partner: boolean;
  partnership_id?: string;
  can_view_partner_goals?: boolean;
  request_status?: "sent" | "received";
  request_id?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers (no hooks / no heavy deps)
// ────────────────────────────────────────────────────────────────────────────

function getSearchParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function setSearchParam(key: string, value: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.replaceState({}, "", url.toString());
}

function deleteSearchParam(key: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete(key);
  window.history.replaceState({}, "", url.toString());
}

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────

const Profile = () => {
  const { user, signOut, isNewUser, markProfileComplete } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams();
  const { isOffline } = useOfflineStatus();

  // ── Local state ───────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>({ is_friend: false });
  const [partnershipStatus, setPartnershipStatus] = useState<PartnershipStatus>({ is_partner: false });
  const [loading, setLoading] = useState(true);

  // Tabs: "profile" | "integrations" – avoiding Radix Tabs to prevent iOS stack overflows
  const [activeTab, setActiveTab] = useState<"profile" | "integrations">(() => {
    const p = getSearchParams().get("tab");
    return p === "integrations" ? "integrations" : "profile";
  });

  // Editing
  const [isEditing, setIsEditing] = useState(false);

  // Friend actions
  const [showUnfriendDialog, setShowUnfriendDialog] = useState(false);
  const [sendingPartnerRequest, setSendingPartnerRequest] = useState(false);

  const { sendFriendRequest, respondToFriendRequest, removeFriend } = useFriends();
  const { sendPartnerRequest } = useAccountabilityPartners();

  // ── Derived ───────────────────────────────────────────────────────────────
  const isOwnProfile = !userId || userId === user?.id;
  const { is_friend, friend_request_status } = friendshipStatus;
  const { is_partner, can_view_partner_goals, request_status: partner_request_status } = partnershipStatus;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTabChange = useCallback((tab: "profile" | "integrations") => {
    setActiveTab(tab);
    setSearchParam("tab", tab);
  }, []);

  const handleSendFriendRequest = async () => {
    await sendFriendRequest(profile!.id);
    setFriendshipStatus({ is_friend: false, friend_request_status: "sent" });
  };

  const handleRespondToRequest = async (response: "accepted" | "rejected") => {
    await respondToFriendRequest(friendshipStatus.request_id || "", response);
    setFriendshipStatus(response === "accepted" ? { is_friend: true } : { is_friend: false });
  };

  const handleUnfriend = async () => {
    setShowUnfriendDialog(false);
    await removeFriend(profile!.id);
    setFriendshipStatus({ is_friend: false });
  };

  const handleSendPartnerRequest = async () => {
    setSendingPartnerRequest(true);
    try {
      await sendPartnerRequest(profile!.id, "", { senderCanViewReceiverGoals: true, receiverCanViewSenderGoals: true });
      setPartnershipStatus({ is_partner: false, request_status: "sent" });
    } finally {
      setSendingPartnerRequest(false);
    }
  };

  // ── Data fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchProfileData = async () => {
      const targetUserId = userId || user?.id;
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      try {
        const isOwner = user?.id === targetUserId;
        const isAuthenticated = !!user;

        let selectColumns = "";
        if (isOwner) {
          selectColumns = "*";
        } else if (isAuthenticated) {
          selectColumns =
            "id, full_name, avatar_url, cover_photo_url, cover_photo_position, about_me, linkedin_url, instagram_url, tiktok_url, twitter_url, social_links_order, created_at, last_active_at";
        } else {
          selectColumns = "id, full_name, avatar_url, cover_photo_url, cover_photo_position, about_me, created_at";
        }

        const [profileResult, friendshipResult, partnershipResult] = await Promise.all([
          supabase.from("profiles").select(selectColumns).eq("id", targetUserId).maybeSingle(),

          isAuthenticated && !isOwner
            ? (async () => {
                const { data: friendData } = await supabase
                  .from("friends")
                  .select("*")
                  .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
                  .or(`user1_id.eq.${targetUserId},user2_id.eq.${targetUserId}`)
                  .maybeSingle();

                if (friendData) return { is_friend: true };

                const { data: requestData } = await supabase
                  .from("friend_requests")
                  .select("id, sender_id, receiver_id, status")
                  .eq("status", "pending")
                  .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                  .or(`sender_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`)
                  .maybeSingle();

                if (requestData) {
                  return requestData.sender_id === user.id
                    ? { is_friend: false, friend_request_status: "sent" as const, request_id: requestData.id }
                    : { is_friend: false, friend_request_status: "received" as const, request_id: requestData.id };
                }

                return { is_friend: false };
              })()
            : Promise.resolve({ is_friend: false }),

          isAuthenticated && !isOwner
            ? (async () => {
                const partnership = await accountabilityService.getPartnershipDetails(targetUserId).catch(() => null);
                if (partnership) {
                  return {
                    is_partner: true,
                    partnership_id: partnership.id,
                    can_view_partner_goals: partnership.can_view_partner_goals,
                  };
                }

                const requests = await accountabilityService.getPartnerRequests().catch(() => ({ sent: [], received: [] }));
                const sentReq = requests.sent.find((r) => r.receiver_id === targetUserId);
                const recvReq = requests.received.find((r) => r.sender_id === targetUserId);

                if (sentReq) return { is_partner: false, request_status: "sent" as const, request_id: sentReq.id };
                if (recvReq) return { is_partner: false, request_status: "received" as const, request_id: recvReq.id };

                return { is_partner: false };
              })()
            : Promise.resolve({ is_partner: false }),
        ]);

        if (cancelled) return;

        const { data: profileData, error: profileError } = profileResult;
        if (profileError) {
          console.error("Error fetching profile:", profileError);
          setLoading(false);
          return;
        }

        if (!profileData) {
          setLoading(false);
          return;
        }

        setProfile(profileData as unknown as Profile);
        setFriendshipStatus(friendshipResult);
        setPartnershipStatus(partnershipResult);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (user !== null || userId) {
      fetchProfileData();
    }

    return () => {
      cancelled = true;
    };
  }, [user, userId]);

  // ── Sync URL on initial setup / new user ─────────────────────────────────
  useEffect(() => {
    const isSetupMode = getSearchParams().get("setup") === "true";
    if (isSetupMode || isNewUser) {
      setIsEditing(true);
    }
  }, [isNewUser]);

  // ── Early returns ─────────────────────────────────────────────────────────

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
      <OfflineFallback
        title="Profile unavailable offline"
        description="Profile data requires an internet connection to load. Please reconnect to view this profile."
      />
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ProfileSkeleton />
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Sub-render: profile view (no Radix Tabs – just conditional rendering)
  // ────────────────────────────────────────────────────────────────────────────

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const renderProfileView = () => {
    if (!profile) return null;

    const socialLinks: Record<string, string> = {};
    SOCIAL_PLATFORMS.forEach((platform) => {
      const value = (profile as unknown as Record<string, unknown>)[platform.id];
      if (typeof value === "string" && value) socialLinks[platform.id] = value;
    });
    const hasSocialLinks = Object.keys(socialLinks).length > 0;

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Card className="glass-card shadow-elegant hover:shadow-lift transition-all overflow-hidden">
          {/* Cover Photo */}
          <div
            className="h-32 sm:h-40 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 relative"
            style={
              profile.cover_photo_url
                ? {
                    backgroundImage: `url(${profile.cover_photo_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: `center ${profile.cover_photo_position ?? 50}%`,
                  }
                : undefined
            }
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>

          {/* Avatar + name */}
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
                {hasSocialLinks && (
                  <div className="mt-3">
                    <SocialLinksDisplay socialLinks={socialLinks} linkOrder={profile.social_links_order} size="sm" />
                  </div>
                )}
              </div>

              {/* Friendship Actions (not own profile) */}
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
                  ) : friend_request_status === "sent" ? (
                    <Button variant="outline" className="bg-accent/50 border-accent text-accent-foreground" disabled>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Request Sent
                    </Button>
                  ) : friend_request_status === "received" ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 transition-all"
                        onClick={() => handleRespondToRequest("accepted")}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 transition-all"
                        onClick={() => handleRespondToRequest("rejected")}
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

            {/* Stats */}
            <div className="mt-6">
              <ProfileStats userId={profile.id} />
            </div>
          </div>

          <CardContent className="p-6 sm:p-8 pt-0">
            {/* Partner banner */}
            {is_partner && !isOwnProfile && (
              <Link to={`/partner/${profile.id}`} className="block mb-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/20">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Accountability Partner</p>
                      <p className="text-sm text-muted-foreground">
                        {can_view_partner_goals ? "View their goals and progress" : "Check in and support each other"}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}

            {/* Request partner (friends only) */}
            {is_friend && !is_partner && !isOwnProfile && !partner_request_status && (
              <div className="mb-6">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 p-4 h-auto border-dashed border-primary/30 hover:bg-primary/5"
                  onClick={handleSendPartnerRequest}
                  disabled={sendingPartnerRequest}
                >
                  {sendingPartnerRequest ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <Handshake className="h-5 w-5 text-primary" />
                  )}
                  <div className="text-left">
                    <p className="font-medium text-foreground">Request Accountability Partnership</p>
                    <p className="text-sm text-muted-foreground font-normal">
                      Support each other's goals and track progress together
                    </p>
                  </div>
                </Button>
              </div>
            )}

            {/* Partner request sent */}
            {!is_partner && partner_request_status === "sent" && !isOwnProfile && (
              <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <Handshake className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Partner Request Sent</p>
                    <p className="text-sm text-muted-foreground">
                      Waiting for {profile.full_name.split(" ")[0]} to accept your request
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* About me */}
            {profile.about_me && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">About</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{profile.about_me}</p>
              </div>
            )}

            {/* Member info */}
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
            </div>
          </CardContent>
        </Card>

        {/* Goals */}
        <ProfileGoals
          userId={profile.id}
          isOwnProfile={isOwnProfile}
          viewerType={isOwnProfile ? "owner" : is_friend ? "friend" : "public"}
        />

        <UnfriendConfirmDialog
          isOpen={showUnfriendDialog}
          onOpenChange={setShowUnfriendDialog}
          onConfirm={handleUnfriend}
          friendName={profile.full_name}
        />
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Main render
  // ────────────────────────────────────────────────────────────────────────────

  // If editing mode, render ProfileEditForm
  if (isEditing && isOwnProfile && profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ProfileEditForm
          profile={profile}
          onUpdate={(updated: Profile) => {
            setProfile(updated);
            setIsEditing(false);
            deleteSearchParam("setup");
            if (isNewUser) markProfileComplete();
          }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        {profile && isOwnProfile && (
          <>
            {/* Simple tab bar (no Radix Tabs) */}
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex gap-2 bg-muted rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => handleTabChange("profile")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "profile"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("integrations")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "integrations"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  Integrations
                </button>
              </div>

              {activeTab === "profile" && (
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  Edit Profile
                </Button>
              )}
            </div>

            {/* Tab content (simple conditional, no Radix) */}
            {activeTab === "profile" && renderProfileView()}
            {activeTab === "integrations" && (
              <div className="max-w-4xl mx-auto">
                <IntegrationsSection />
              </div>
            )}
          </>
        )}

        {/* Viewing someone else's profile */}
        {profile && !isOwnProfile && renderProfileView()}
    </div>
  );
};

export default Profile;

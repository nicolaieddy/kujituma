import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { useFriends } from "@/hooks/useFriends";
import { useAccountabilityPartners } from "@/hooks/useAccountabilityPartners";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { FriendsView } from "@/components/friends/FriendsView";
import { AccountabilityPartnersTab } from "@/components/accountability/AccountabilityPartnersTab";
import { OfflineFallback } from "@/components/pwa/OfflineFallback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Inbox, Handshake } from "lucide-react";
import { FriendsSkeleton } from "@/components/skeletons/PageSkeletons";

const Friends = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isOffline } = useOfflineStatus();
  const { isAdmin } = useAdminStatus();
  const { friends, friendRequests, loading } = useFriends();
  const { partners } = useAccountabilityPartners();
  
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || 'friends';
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['friends', 'requests', 'discover', 'partners'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Redirect to auth if not logged in (avoid navigate during render)
  useEffect(() => {
    console.log('[Friends] Auth check - loading:', authLoading, 'user:', user?.email);
    if (!authLoading && !user) {
      console.log('[Friends] No user, redirecting to /auth');
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams(tab === 'friends' ? {} : { tab });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader isAdmin={false} onSignOut={() => {}} />
        <div className="container mx-auto px-4 py-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 font-heading">Friends</h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Connect with other members of the community and follow their progress.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <FriendsSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isOffline) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader isAdmin={isAdmin} onSignOut={handleSignOut} />
        <OfflineFallback 
          title="Friends unavailable offline"
          description="Friends and discovery features require an internet connection. Please reconnect to access this section."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 font-heading">Friends</h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Connect with other members of the community and follow their progress.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="friends" className="flex items-center gap-1 text-xs sm:text-sm">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Friends</span>
                {friends.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {friends.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="partners" className="flex items-center gap-1 text-xs sm:text-sm">
                <Handshake className="h-4 w-4" />
                <span className="hidden sm:inline">Partners</span>
                {partners.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {partners.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-1 text-xs sm:text-sm">
                <Inbox className="h-4 w-4" />
                <span className="hidden sm:inline">Requests</span>
                {(friendRequests.received.length + friendRequests.sent.length) > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {friendRequests.received.length + friendRequests.sent.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="discover" className="flex items-center gap-1 text-xs sm:text-sm">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Discover</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends">
              <FriendsView 
                view="friends" 
                friends={friends}
                friendRequests={friendRequests}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="partners">
              <AccountabilityPartnersTab />
            </TabsContent>

            <TabsContent value="requests">
              <FriendsView 
                view="requests" 
                friends={friends}
                friendRequests={friendRequests}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="discover">
              <FriendsView 
                view="discover" 
                friends={friends}
                friendRequests={friendRequests}
                loading={loading}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Friends;
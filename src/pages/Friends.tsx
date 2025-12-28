import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { useFriends } from "@/hooks/useFriends";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { FriendsView } from "@/components/friends/FriendsView";
import { OfflineFallback } from "@/components/pwa/OfflineFallback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Inbox } from "lucide-react";
import { KilimanjaroLoader } from "@/components/ui/kilimanjaro-loader";

const Friends = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isOffline } = useOfflineStatus();
  const { isAdmin } = useAdminStatus();
  const { friends, friendRequests, loading } = useFriends();
  
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || 'friends';
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['friends', 'requests', 'discover'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <KilimanjaroLoader />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
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
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="friends" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Friends
                {friends.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {friends.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <Inbox className="h-4 w-4" />
                Requests
                {(friendRequests.received.length + friendRequests.sent.length) > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {friendRequests.received.length + friendRequests.sent.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="discover" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Discover
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
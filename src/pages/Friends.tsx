import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useFriends } from "@/hooks/useFriends";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { FriendsView } from "@/components/friends/FriendsView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Inbox } from "lucide-react";

const Friends = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const { friends, friendRequests, loading } = useFriends();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-secondary flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-secondary">
      <DashboardHeader 
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Friends</h1>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto">
            Connect with other members of the community and follow their progress.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="friends" className="w-full">
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
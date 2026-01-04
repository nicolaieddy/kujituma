import { useState, useEffect } from "react";
import { FriendCard } from "./FriendCard";
import { FriendRequestCard } from "./FriendRequestCard";
import { UserSearchCard } from "./UserSearchCard";
import { useFriends } from "@/hooks/useFriends";
import { useDebounce } from "@/hooks/useDebounce";
import { friendsService, Friend, FriendRequest, UserProfile } from "@/services/friendsService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Search, Users, UserPlus, Inbox, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FriendsViewProps {
  view: 'friends' | 'requests' | 'discover';
  friends: Friend[];
  friendRequests: {
    sent: FriendRequest[];
    received: FriendRequest[];
  };
  loading: boolean;
}

export const FriendsView = ({ view, friends, friendRequests, loading }: FriendsViewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allUsersLoaded, setAllUsersLoaded] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  const { 
    sendFriendRequest, 
    respondToFriendRequest, 
    cancelFriendRequest,
    removeFriend 
  } = useFriends();

  // Search for users
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await friendsService.searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Load all users when discover view is first opened
  const loadAllUsers = async () => {
    if (allUsersLoaded) return; // Don't reload if already loaded
    
    setSearchLoading(true);
    try {
      const results = await friendsService.searchUsers('');
      setAllUsers(results);
      setAllUsersLoaded(true);
    } catch (error) {
      console.error('Error loading all users:', error);
      setAllUsers([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Auto-search when debounced query changes or load all users when discover view opens
  useEffect(() => {
    const searchEffect = async () => {
      if (view === 'discover') {
        if (debouncedSearchQuery) {
          await handleSearch(debouncedSearchQuery);
        } else if (!allUsersLoaded) {
          await loadAllUsers();
        }
      }
    };
    searchEffect();
  }, [debouncedSearchQuery, view]); // Removed allUsers.length dependency

  const handleAcceptRequest = async (requestId: string) => {
    await respondToFriendRequest(requestId, 'accepted');
  };

  const handleRejectRequest = async (requestId: string) => {
    await respondToFriendRequest(requestId, 'rejected');
  };

  const handleCancelRequest = async (requestId: string) => {
    await cancelFriendRequest(requestId);
  };

  const handleSendRequest = async (userId: string) => {
    const result = await sendFriendRequest(userId);
    if (result.success) {
      // Remove user from search results since request was sent
      setSearchResults(prev => prev.filter(user => user.id !== userId));
      // Also remove from allUsers list
      setAllUsers(prev => prev.filter(user => user.id !== userId));
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    await removeFriend(friendId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  // Friends View
  if (view === 'friends') {
    return (
      <div className="space-y-6">
        <Card className="border-border hover:border-primary/20 transition-colors">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Friends ({friends.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {friends.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="relative inline-block">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground animate-pulse" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary/10 animate-ping" />
                </div>
                <div>
                  <p className="text-foreground font-medium mb-2">No friends yet</p>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Build your network! Connect with other climbers and share your journey together.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {friends.map((friend) => (
                  <FriendCard
                    key={friend.friend_id}
                    friend={friend}
                    onRemove={handleRemoveFriend}
                    loading={loading}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Requests View
  if (view === 'requests') {
    const hasRequests = friendRequests.received.length > 0 || friendRequests.sent.length > 0;

    return (
      <div className="space-y-6">
        {/* Received Requests */}
        <Card className="border-border hover:border-primary/20 transition-colors">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Received Requests ({friendRequests.received.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {friendRequests.received.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No pending friend requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {friendRequests.received.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    type="received"
                    onAccept={handleAcceptRequest}
                    onReject={handleRejectRequest}
                    loading={loading}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sent Requests */}
        <Card className="border-border hover:border-primary/20 transition-colors">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Sent Requests ({friendRequests.sent.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {friendRequests.sent.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No outgoing friend requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {friendRequests.sent.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    type="sent"
                    onCancel={handleCancelRequest}
                    loading={loading}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {!hasRequests && (
          <div className="text-center py-12 space-y-4">
            <div className="relative inline-block">
              <Inbox className="h-16 w-16 mx-auto text-muted-foreground animate-pulse" />
            </div>
            <div>
              <p className="text-foreground font-medium text-lg mb-2">No friend requests</p>
              <p className="text-muted-foreground max-w-sm mx-auto">
                When someone sends you a friend request, it will appear here.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Discover View
  if (view === 'discover') {
    return (
      <div className="space-y-6">
        <Card className="border-border hover:border-primary/20 transition-colors">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Search className="h-5 w-5" />
              Discover People
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search for people by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {searchLoading && (
              <div className="text-center py-6">
                <p className="text-muted-foreground">Searching...</p>
              </div>
            )}

            {!searchLoading && searchQuery && searchResults.length === 0 && (
              <div className="text-center py-8 space-y-3">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">No users found matching "{searchQuery}"</p>
              </div>
            )}

            {!searchLoading && searchResults.length > 0 && (
              <div className="space-y-4">
                {searchResults.map((user) => (
                  <UserSearchCard
                    key={user.id}
                    user={user}
                    onSendRequest={handleSendRequest}
                    loading={loading}
                  />
                ))}
              </div>
            )}

            {!searchLoading && !searchQuery && allUsers.length > 0 && (
              <div className="space-y-4">
                {allUsers.map((user) => (
                  <UserSearchCard
                    key={user.id}
                    user={user}
                    onSendRequest={handleSendRequest}
                    loading={loading}
                  />
                ))}
              </div>
            )}

            {!searchQuery && allUsers.length === 0 && !searchLoading && (
              <div className="text-center py-12 space-y-4">
                <div className="relative inline-block">
                  <Search className="h-16 w-16 mx-auto text-muted-foreground animate-pulse" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary/10 animate-ping" />
                </div>
                <div>
                  <p className="text-foreground font-medium text-lg mb-2">Find new friends</p>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Use the search above to find specific people, or browse all users below.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

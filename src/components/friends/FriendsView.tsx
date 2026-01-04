import { useFriends } from "@/hooks/useFriends";
import { Friend, FriendRequest } from "@/services/friendsService";
import { UserSearchSection } from "./UserSearchSection";
import { FriendRequestsSection } from "./FriendRequestsSection";
import { FriendsListSection } from "./FriendsListSection";

interface FriendsViewProps {
  friends: Friend[];
  friendRequests: {
    sent: FriendRequest[];
    received: FriendRequest[];
  };
  loading: boolean;
}

export const FriendsView = ({ friends, friendRequests, loading }: FriendsViewProps) => {
  const { 
    sendFriendRequest, 
    respondToFriendRequest, 
    cancelFriendRequest,
    removeFriend 
  } = useFriends();

  const handleAcceptRequest = async (requestId: string) => {
    await respondToFriendRequest(requestId, 'accepted');
  };

  const handleRejectRequest = async (requestId: string) => {
    await respondToFriendRequest(requestId, 'rejected');
  };

  const handleCancelRequest = async (requestId: string) => {
    await cancelFriendRequest(requestId);
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

  return (
    <div className="space-y-6">
      <UserSearchSection 
        onSendRequest={sendFriendRequest}
        loading={loading}
      />

      <FriendRequestsSection
        receivedRequests={friendRequests.received}
        sentRequests={friendRequests.sent}
        onAccept={handleAcceptRequest}
        onReject={handleRejectRequest}
        onCancel={handleCancelRequest}
        loading={loading}
      />

      <FriendsListSection
        friends={friends}
        onRemove={handleRemoveFriend}
        loading={loading}
      />
    </div>
  );
};

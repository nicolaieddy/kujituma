import { useFriends } from "@/hooks/useFriends";
import { Friend, FriendRequest } from "@/services/friendsService";
import { UserSearchSection } from "./UserSearchSection";
import { FriendRequestsSection } from "./FriendRequestsSection";
import { FriendsListSection } from "./FriendsListSection";
import { AccountabilityPartner, AccountabilityPartnerRequest } from "@/services/accountabilityService";
import { useAccountabilityPartners } from "@/hooks/useAccountabilityPartners";

interface FriendsViewProps {
  friends: Friend[];
  friendRequests: {
    sent: FriendRequest[];
    received: FriendRequest[];
  };
  loading: boolean;
  partners?: AccountabilityPartner[];
  partnerRequests?: {
    sent: AccountabilityPartnerRequest[];
    received: AccountabilityPartnerRequest[];
  };
}

export const FriendsView = ({ 
  friends, 
  friendRequests, 
  loading,
  partners = [],
  partnerRequests = { sent: [], received: [] },
}: FriendsViewProps) => {
  const { 
    sendFriendRequest, 
    respondToFriendRequest, 
    cancelFriendRequest,
    removeFriend 
  } = useFriends();

  const { sendPartnerRequest } = useAccountabilityPartners();

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

  const handleSendPartnerRequest = async (friendId: string) => {
    return await sendPartnerRequest(friendId);
  };

  // Build set of user IDs with pending partner requests (sent by current user)
  const pendingPartnerRequests = new Set(partnerRequests.sent.map(r => r.receiver_id));

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
        onSendPartnerRequest={handleSendPartnerRequest}
        loading={loading}
        partners={partners}
        pendingPartnerRequests={pendingPartnerRequests}
      />
    </div>
  );
};

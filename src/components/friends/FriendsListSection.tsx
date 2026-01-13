import { FriendCard } from "./FriendCard";
import { Friend } from "@/services/friendsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { AccountabilityPartner } from "@/services/accountabilityService";

interface FriendsListSectionProps {
  friends: Friend[];
  onRemove: (friendId: string) => Promise<void>;
  onSendPartnerRequest?: (friendId: string) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
  partners?: AccountabilityPartner[];
  pendingPartnerRequests?: Set<string>;
}

export const FriendsListSection = ({ 
  friends, 
  onRemove, 
  onSendPartnerRequest,
  loading,
  partners = [],
  pendingPartnerRequests = new Set(),
}: FriendsListSectionProps) => {
  const partnerIds = new Set(partners.map(p => p.partner_id));

  return (
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
              <Users className="h-16 w-16 mx-auto text-muted-foreground" />
            </div>
            <div>
              <p className="text-foreground font-medium mb-2">No friends yet</p>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Use the search above to find and connect with others.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {friends.map((friend) => (
              <FriendCard
                key={friend.friend_id}
                friend={friend}
                onRemove={onRemove}
                onSendPartnerRequest={onSendPartnerRequest}
                loading={loading}
                isAlreadyPartner={partnerIds.has(friend.friend_id)}
                hasPendingPartnerRequest={pendingPartnerRequests.has(friend.friend_id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

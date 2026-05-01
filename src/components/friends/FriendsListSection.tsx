import { FriendCard } from "./FriendCard";
import { Friend } from "@/services/friendsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { AccountabilityPartner } from "@/services/accountabilityService";
import { EmptyState } from "@/components/ui/empty-state";
import { PeopleEmpty } from "@/components/illustrations";

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
          <EmptyState
            illustration={<PeopleEmpty />}
            title="No friends yet"
            description="Use the search above to find and connect with others."
          />
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

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, UserMinus, MessageCircle } from "lucide-react";
import { Friend } from "@/services/friendsService";
import { useNavigate } from "react-router-dom";

interface FriendCardProps {
  friend: Friend;
  onRemove?: (friendId: string) => void;
  loading?: boolean;
  showActions?: boolean;
}

export const FriendCard = ({
  friend,
  onRemove,
  loading = false,
  showActions = true
}: FriendCardProps) => {
  const navigate = useNavigate();

  const handleViewProfile = () => {
    navigate(`/profile/${friend.friend_id}`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer flex-1"
            onClick={handleViewProfile}
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={friend.avatar_url} alt={friend.full_name} />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium text-foreground hover:text-primary transition-colors">
                {friend.full_name}
              </h4>
              <p className="text-xs text-muted-foreground">
                Friends since {new Date(friend.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {showActions && (
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleViewProfile}
                className="text-primary hover:text-primary-dark"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRemove?.(friend.friend_id)}
                disabled={loading}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <UserMinus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
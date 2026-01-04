import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, UserMinus, MessageCircle, Users, Clock } from "lucide-react";
import { Friend } from "@/services/friendsService";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface FriendCardProps {
  friend: Friend;
  onRemove?: (friendId: string) => void;
  loading?: boolean;
  showActions?: boolean;
}

const getLastActiveText = (lastActiveAt?: string): string => {
  if (!lastActiveAt) return "Never";
  
  const lastActive = new Date(lastActiveAt);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60));
  
  if (diffMinutes < 5) return "Online now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  
  return formatDistanceToNow(lastActive, { addSuffix: true });
};

const isRecentlyActive = (lastActiveAt?: string): boolean => {
  if (!lastActiveAt) return false;
  const lastActive = new Date(lastActiveAt);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60));
  return diffMinutes < 5;
};

export const FriendCard = ({
  friend,
  onRemove,
  loading = false,
  showActions = true
}: FriendCardProps) => {
  const navigate = useNavigate();
  const recentlyActive = isRecentlyActive(friend.last_active_at);
  const lastActiveText = getLastActiveText(friend.last_active_at);

  const handleViewProfile = () => {
    navigate(`/profile/${friend.friend_id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      <Card className="hover:shadow-lg transition-shadow border-border hover:border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center space-x-3 cursor-pointer flex-1"
              onClick={handleViewProfile}
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={friend.avatar_url} alt={friend.full_name} />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                {recentlyActive && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-foreground hover:text-primary transition-colors truncate">
                  {friend.full_name}
                </h4>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {friend.friend_count ?? 0} friends
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span className={recentlyActive ? "text-green-600 dark:text-green-400" : ""}>
                      {lastActiveText}
                    </span>
                  </span>
                </div>
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
    </motion.div>
  );
};
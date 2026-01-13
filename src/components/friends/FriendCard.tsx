import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, UserMinus, Users, Clock, Handshake, Check, Loader2 } from "lucide-react";
import { Friend } from "@/services/friendsService";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface FriendCardProps {
  friend: Friend;
  onRemove?: (friendId: string) => void;
  onSendPartnerRequest?: (friendId: string) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
  showActions?: boolean;
  isAlreadyPartner?: boolean;
  hasPendingPartnerRequest?: boolean;
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
  onSendPartnerRequest,
  loading = false,
  showActions = true,
  isAlreadyPartner = false,
  hasPendingPartnerRequest = false,
}: FriendCardProps) => {
  const navigate = useNavigate();
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(hasPendingPartnerRequest);
  const recentlyActive = isRecentlyActive(friend.last_active_at);
  const lastActiveText = getLastActiveText(friend.last_active_at);

  // Sync local state with prop when it changes (e.g., from real-time updates)
  useEffect(() => {
    setRequestSent(hasPendingPartnerRequest);
  }, [hasPendingPartnerRequest]);

  const handleViewProfile = () => {
    navigate(`/profile/${friend.friend_id}`);
  };

  const handleSendPartnerRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSendPartnerRequest || isAlreadyPartner || requestSent) return;
    
    setSendingRequest(true);
    try {
      const result = await onSendPartnerRequest(friend.friend_id);
      if (result.success) {
        setRequestSent(true);
        toast.success("Partner request sent!");
      } else {
        toast.error(result.error || "Failed to send request");
      }
    } catch (error) {
      toast.error("Failed to send request");
    } finally {
      setSendingRequest(false);
    }
  };

  const friendsSinceDate = format(new Date(friend.created_at), "MMMM d, yyyy");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
        >
          <Card 
            className="hover:shadow-lg transition-shadow border-border hover:border-primary/20 cursor-pointer"
            onClick={handleViewProfile}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={friend.avatar_url} alt={friend.full_name} />
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    {/* Facebook-style green dot for online status */}
                    {recentlyActive && (
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground hover:text-primary transition-colors truncate">
                        {friend.full_name}
                      </h4>
                      {/* Accountability partner badge - subtle indicator */}
                      {isAlreadyPartner && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-success/10 text-success flex-shrink-0">
                              <Handshake className="h-3 w-3" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Accountability Partner</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {friend.friend_count ?? 0} friends
                      </span>
                      {(friend.mutual_friends_count ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-primary">
                          <Users className="h-3 w-3" />
                          {friend.mutual_friends_count} mutual
                        </span>
                      )}
                      {!recentlyActive && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {lastActiveText}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {showActions && (
                  <div className="flex space-x-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Accountability Partner Request Button - only show if not already partner */}
                    {!isAlreadyPartner && (
                      requestSent ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled
                              className="text-muted-foreground"
                            >
                              <Handshake className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Partner request pending</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleSendPartnerRequest}
                              disabled={sendingRequest || loading}
                              className="text-primary hover:text-primary-foreground hover:bg-primary"
                            >
                              {sendingRequest ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Handshake className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Send partner request</p>
                          </TooltipContent>
                        </Tooltip>
                      )
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove?.(friend.friend_id);
                      }}
                      disabled={loading}
                      className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Friends since {friendsSinceDate}</p>
      </TooltipContent>
    </Tooltip>
  );
};
